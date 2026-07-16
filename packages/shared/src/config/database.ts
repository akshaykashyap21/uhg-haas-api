import { DataSource, DataSourceOptions } from 'typeorm';
import { SqlEnv } from './env';

/**
 * TypeORM's mssql driver loads `tedious` by default, which cannot do Windows
 * Integrated Auth (results in "Login failed for user ''."). Patch it to use
 * `mssql/msnodesqlv8` when Windows auth is enabled.
 */
function enableWindowsAuthSqlDriver(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { SqlServerDriver } = require('typeorm/driver/sqlserver/SqlServerDriver') as {
    SqlServerDriver: { prototype: { loadDependencies: () => void; mssql?: unknown } };
  };

  SqlServerDriver.prototype.loadDependencies = function loadDependencies(this: {
    mssql?: unknown;
  }) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.mssql = require('mssql/msnodesqlv8');
    } catch {
      throw new Error(
        'Windows Authentication requires msnodesqlv8. ' +
          'Install: npm install msnodesqlv8@5.2.1 -w @uhg-haas/auth-service ' +
          '(use Node 20/22/24 for prebuilds). Also install ODBC Driver 17 for SQL Server.',
      );
    }
  };
}

function parseHost(host: string): { host: string; instanceName?: string } {
  const normalized = host.replace(/\//g, '\\');
  const idx = normalized.indexOf('\\');
  if (idx === -1) {
    return { host: normalized };
  }
  return {
    host: normalized.slice(0, idx),
    instanceName: normalized.slice(idx + 1),
  };
}

function buildWindowsAuthConnectionString(env: SqlEnv, host: string, instanceName?: string): string {
  const server = instanceName ? `${host}\\${instanceName}` : `${host},${env.AZURE_SQL_PORT}`;
  const trust = env.AZURE_SQL_TRUST_SERVER_CERTIFICATE ? 'yes' : 'no';
  const encrypt = env.AZURE_SQL_ENCRYPT ? 'yes' : 'no';
  // Prefer ODBC 17 — widely installed; Native Client 11.0 is often missing on new Windows.
  return [
    'Driver={ODBC Driver 17 for SQL Server}',
    `Server=${server}`,
    `Database=${env.AZURE_SQL_DATABASE}`,
    'Trusted_Connection=yes',
    `TrustServerCertificate=${trust}`,
    `Encrypt=${encrypt}`,
  ].join(';');
}

export function buildDataSourceOptions(
  env: SqlEnv & { NODE_ENV: string },
  entities: DataSourceOptions['entities'],
): DataSourceOptions {
  const { host, instanceName } = parseHost(env.AZURE_SQL_HOST);

  if (env.AZURE_SQL_WINDOWS_AUTH) {
    enableWindowsAuthSqlDriver();
  }

  const sqlOptions: Record<string, unknown> = {
    encrypt: env.AZURE_SQL_ENCRYPT,
    trustServerCertificate: env.AZURE_SQL_TRUST_SERVER_CERTIFICATE,
    enableArithAbort: true,
  };

  if (instanceName) {
    sqlOptions.instanceName = instanceName;
  }

  if (env.AZURE_SQL_WINDOWS_AUTH) {
    sqlOptions.trustedConnection = true;
  }

  if (env.AZURE_SQL_WINDOWS_AUTH) {
    return {
      type: 'mssql',
      host,
      ...(instanceName ? {} : { port: env.AZURE_SQL_PORT }),
      database: env.AZURE_SQL_DATABASE,
      synchronize: env.TYPEORM_SYNC && env.NODE_ENV !== 'production',
      logging: env.TYPEORM_LOGGING,
      entities,
      options: sqlOptions,
      extra: {
        connectionString: buildWindowsAuthConnectionString(env, host, instanceName),
        connectionTimeout: 30000,
        requestTimeout: 30000,
        options: {
          trustedConnection: true,
          trustServerCertificate: env.AZURE_SQL_TRUST_SERVER_CERTIFICATE,
          encrypt: env.AZURE_SQL_ENCRYPT,
        },
        pool: {
          max: 10,
          min: 1,
          idleTimeoutMillis: 30000,
        },
      },
    };
  }

  return {
    type: 'mssql',
    host,
    ...(instanceName ? {} : { port: env.AZURE_SQL_PORT }),
    database: env.AZURE_SQL_DATABASE,
    username: env.AZURE_SQL_USER,
    password: env.AZURE_SQL_PASSWORD,
    synchronize: env.TYPEORM_SYNC && env.NODE_ENV !== 'production',
    logging: env.TYPEORM_LOGGING,
    entities,
    options: sqlOptions,
    extra: {
      connectionTimeout: 30000,
      requestTimeout: 30000,
      pool: {
        max: 10,
        min: 1,
        idleTimeoutMillis: 30000,
      },
    },
  };
}

export async function initializeDataSource(dataSource: DataSource): Promise<DataSource> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  return dataSource;
}

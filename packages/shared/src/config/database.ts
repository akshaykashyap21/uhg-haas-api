import { DataSource, DataSourceOptions } from 'typeorm';
import { SqlEnv } from './env';

export function buildDataSourceOptions(
  env: SqlEnv & { NODE_ENV: string },
  entities: DataSourceOptions['entities'],
): DataSourceOptions {
  const sqlOptions = {
    encrypt: env.AZURE_SQL_ENCRYPT,
    trustServerCertificate: env.AZURE_SQL_TRUST_SERVER_CERTIFICATE,
    enableArithAbort: true,
    ...(env.AZURE_SQL_WINDOWS_AUTH ? { trustedConnection: true } : {}),
  };

  const authFields = env.AZURE_SQL_WINDOWS_AUTH
    ? {}
    : {
        username: env.AZURE_SQL_USER,
        password: env.AZURE_SQL_PASSWORD,
      };

  return {
    type: 'mssql',
    host: env.AZURE_SQL_HOST,
    port: env.AZURE_SQL_PORT,
    database: env.AZURE_SQL_DATABASE,
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
    ...authFields,
  };
}

export async function initializeDataSource(dataSource: DataSource): Promise<DataSource> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  return dataSource;
}

import { DataSource, DataSourceOptions } from 'typeorm';
import { SqlEnv } from './env';

export function buildDataSourceOptions(
  env: SqlEnv & { NODE_ENV: string },
  entities: DataSourceOptions['entities'],
): DataSourceOptions {
  return {
    type: 'mssql',
    host: env.AZURE_SQL_HOST,
    port: env.AZURE_SQL_PORT,
    username: env.AZURE_SQL_USER,
    password: env.AZURE_SQL_PASSWORD,
    database: env.AZURE_SQL_DATABASE,
    synchronize: env.TYPEORM_SYNC && env.NODE_ENV !== 'production',
    logging: env.TYPEORM_LOGGING,
    entities,
    options: {
      encrypt: env.AZURE_SQL_ENCRYPT,
      trustServerCertificate: env.AZURE_SQL_TRUST_SERVER_CERTIFICATE,
      enableArithAbort: true,
    },
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

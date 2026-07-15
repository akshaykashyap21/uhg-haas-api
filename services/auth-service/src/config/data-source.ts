import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '@app/shared';
import { env } from './env';
import { User } from '../entities/User';
import { RefreshToken } from '../entities/RefreshToken';

export const AppDataSource = new DataSource(buildDataSourceOptions(env, [User, RefreshToken]));

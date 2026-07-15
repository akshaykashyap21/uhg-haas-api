import Joi from 'joi';
import { AppEnv, loadAppEnv, loadDotenv } from '@app/shared';

loadDotenv();

export interface GatewayEnv extends AppEnv {
  AUTH_SERVICE_URL: string;
}

export const env = loadAppEnv<GatewayEnv>(
  Joi.object({
    AUTH_SERVICE_URL: Joi.string().uri().required(),
  }),
);

import { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors/AppError';

type RequestSource = 'body' | 'query' | 'params' | 'headers';

export interface ValidateOptions {
  source?: RequestSource;
  stripUnknown?: boolean;
}

export function validate(schema: Joi.ObjectSchema, options: ValidateOptions = {}) {
  const { source = 'body', stripUnknown = true } = options;

  return (req: Request, _res: Response, next: NextFunction): void => {
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown,
      convert: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));
      next(new ValidationError('Request validation failed', details));
      return;
    }

    req[source] = value;
    next();
  };
}

import { NextFunction, Request, Response } from 'express';
import { Logger } from 'winston';
import { AppError } from '../errors/AppError';
import { sendError } from '../utils/response';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(logger: Logger) {
  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    const correlationId = req.correlationId;

    if (err instanceof AppError) {
      if (!err.isOperational) {
        logger.error('Non-operational error', {
          correlationId,
          error: err.message,
          stack: err.stack,
        });
      } else if (err.statusCode >= 500) {
        logger.error(err.message, { correlationId, code: err.code, stack: err.stack });
      } else {
        logger.warn(err.message, { correlationId, code: err.code, details: err.details });
      }

      sendError(res, err.statusCode, err.message, err.code, err.details, correlationId);
      return;
    }

    logger.error('Unhandled error', {
      correlationId,
      error: err.message,
      stack: err.stack,
    });

    const isProd = process.env.NODE_ENV === 'production';
    sendError(
      res,
      500,
      isProd ? 'Internal server error' : err.message,
      'INTERNAL_ERROR',
      undefined,
      correlationId,
    );
  };
}

import { NextFunction, Request, Response } from 'express';
import { Logger } from 'winston';

export function requestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    res.on('finish', () => {
      logger.info('HTTP request', {
        correlationId: req.correlationId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      });
    });

    next();
  };
}

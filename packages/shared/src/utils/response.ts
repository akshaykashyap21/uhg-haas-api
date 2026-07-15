import { Response } from 'express';
import { ApiResponse } from '../types/auth';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  correlationId?: string,
): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta: {
      correlationId: correlationId || (res.getHeader('x-correlation-id') as string) || '',
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: unknown,
  correlationId?: string,
): Response {
  const body: ApiResponse = {
    success: false,
    message,
    error: { code, details },
    meta: {
      correlationId: correlationId || (res.getHeader('x-correlation-id') as string) || '',
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(statusCode).json(body);
}

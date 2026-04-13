import { NextFunction, Request, Response } from 'express';
import { AppError, isAppError } from '../utils/errors';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const mongoError = err as { code?: number; keyValue?: Record<string, unknown>; name?: string };
  if (mongoError?.code === 11000) {
    res.status(409).json({
      message: 'Duplicate key error',
      details: mongoError.keyValue,
    });
    return;
  }
  if (mongoError?.name === 'ValidationError') {
    res.status(400).json({
      message: 'Validation error',
    });
    return;
  }

  if (isAppError(err)) {
    res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
    return;
  }

  res.status(500).json({
    message: 'Internal server error',
    details: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
}

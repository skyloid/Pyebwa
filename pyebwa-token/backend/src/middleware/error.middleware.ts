import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err as AppError;

  // Log error
  logger.error('Error Handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error = new AppError('Validation Error', 400);
  } else if (err.name === 'CastError') {
    error = new AppError('Invalid ID format', 400);
  } else if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401);
  } else if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401);
  }

  // Default to 500 server error
  if (!error.statusCode) {
    error.statusCode = 500;
  }

  // Send error response
  res.status(error.statusCode).json({
    error: {
      message: error.message,
      status: error.statusCode,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};
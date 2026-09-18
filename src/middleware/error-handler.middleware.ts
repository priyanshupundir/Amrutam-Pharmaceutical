import { Request, Response, NextFunction } from 'express';
import { AppError } from '../core/errors';
import { logger } from '../core/logger';
import { getCorrelationId } from '../core/async-context';
import { config } from '../config';

export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const correlationId = getCorrelationId();

  if (err instanceof AppError) {
    logger.warn(
      {
        err: {
          message: err.message,
          errorCode: err.errorCode,
          statusCode: err.statusCode,
          details: err.details,
        },
        path: req.originalUrl,
      },
      `Operational error: ${err.message}`
    );

    res.status(err.statusCode).json({
      type: `https://errors.amrutam.co.in/${err.errorCode.toLowerCase()}`,
      title: err.name,
      status: err.statusCode,
      detail: err.message,
      code: err.errorCode,
      instance: req.originalUrl,
      correlationId,
      timestamp: new Date().toISOString(),
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  // Unhandled / programmer error
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
      },
      path: req.originalUrl,
    },
    `Unhandled error: ${err.message}`
  );

  res.status(500).json({
    type: 'https://errors.amrutam.co.in/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: config.NODE_ENV === 'production' ? 'An internal server error occurred' : err.message,
    code: 'INTERNAL_SERVER_ERROR',
    instance: req.originalUrl,
    correlationId,
    timestamp: new Date().toISOString(),
    ...(config.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {}),
  });
}

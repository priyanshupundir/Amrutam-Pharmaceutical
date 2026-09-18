import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { errorHandlerMiddleware } from './middleware/error-handler.middleware';
import { NotFoundError } from './core/errors';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Idempotency-Key'],
    })
  );

  // Body parsing with rawBody capture for hash verification
  app.use(
    express.json({
      limit: '2mb',
      verify: (req: Request & { rawBody?: string }, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Correlation & context tracking
  app.use(requestIdMiddleware);

  // Structured request logging
  app.use(requestLoggerMiddleware);

  // Liveness probe (Kubernetes / ECS)
  app.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Base API info
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      service: 'Amrutam Telemedicine Backend',
      version: '1.0.0',
      status: 'operational',
      docs: '/api-docs',
    });
  });

  // Catch-all 404 handler
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError('The requested resource was not found on this server'));
  });

  // Centralized RFC 7807 error handler
  app.use(errorHandlerMiddleware);

  return app;
}

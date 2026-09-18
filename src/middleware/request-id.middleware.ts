import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runWithContext } from '../core/async-context';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    uuidv4();

  res.setHeader('X-Correlation-ID', correlationId);

  runWithContext(
    {
      correlationId,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    },
    () => {
      next();
    }
  );
}

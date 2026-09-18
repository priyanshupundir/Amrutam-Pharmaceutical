export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown> | unknown[];

  constructor(message: string, isOperational = true, details?: Record<string, unknown> | unknown[]) {
    super(message);
    this.name = this.constructor.name;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly statusCode = 400;
  public readonly errorCode = 'VALIDATION_ERROR';

  constructor(message = 'Invalid request parameters', details?: Record<string, unknown> | unknown[]) {
    super(message, true, details);
  }
}

export class UnauthorizedError extends AppError {
  public readonly statusCode = 401;
  public readonly errorCode = 'UNAUTHORIZED';

  constructor(message = 'Authentication required or invalid credentials', details?: Record<string, unknown>) {
    super(message, true, details);
  }
}

export class ForbiddenError extends AppError {
  public readonly statusCode = 403;
  public readonly errorCode = 'FORBIDDEN';

  constructor(message = 'Access denied for requested resource', details?: Record<string, unknown>) {
    super(message, true, details);
  }
}

export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  public readonly errorCode = 'NOT_FOUND';

  constructor(message = 'Requested resource not found', details?: Record<string, unknown>) {
    super(message, true, details);
  }
}

export class ConflictError extends AppError {
  public readonly statusCode = 409;
  public readonly errorCode = 'CONFLICT';

  constructor(message = 'Resource conflict detected', details?: Record<string, unknown>) {
    super(message, true, details);
  }
}

export class IdempotencyConflictError extends AppError {
  public readonly statusCode = 409;
  public readonly errorCode = 'IDEMPOTENCY_IN_PROGRESS';

  constructor(message = 'A request with this Idempotency-Key is currently processing', details?: Record<string, unknown>) {
    super(message, true, details);
  }
}

export class RateLimitError extends AppError {
  public readonly statusCode = 429;
  public readonly errorCode = 'RATE_LIMIT_EXCEEDED';

  constructor(message = 'Too many requests, please try again later', details?: Record<string, unknown>) {
    super(message, true, details);
  }
}

export class InternalServerError extends AppError {
  public readonly statusCode = 500;
  public readonly errorCode = 'INTERNAL_SERVER_ERROR';

  constructor(message = 'An unexpected internal error occurred', details?: Record<string, unknown>) {
    super(message, false, details);
  }
}

export class ServiceUnavailableError extends AppError {
  public readonly statusCode = 503;
  public readonly errorCode = 'SERVICE_UNAVAILABLE';

  constructor(message = 'Service temporarily unavailable, please retry', details?: Record<string, unknown>) {
    super(message, true, details);
  }
}

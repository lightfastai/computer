import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import pino from 'pino';
import { ZodError } from 'zod';

const log = pino();

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export async function errorHandler(err: Error, c: Context) {
  // Handle HTTPException from Hono
  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        code: 'HTTP_EXCEPTION',
      },
      err.status,
    );
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
      400,
    );
  }

  // Handle custom app errors
  if (err instanceof AppError) {
    return c.json(
      {
        error: err.message,
        code: err.code,
      },
      err.statusCode as 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500,
    );
  }

  // Log unexpected errors
  log.error('Unexpected error:', err);

  // Generic error response
  return c.json(
    {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
    500,
  );
}

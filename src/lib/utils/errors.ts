import { NextResponse } from 'next/server';

/**
 * Structured application error with HTTP status code.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number = 400, code: string = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMITED');
    this.name = 'RateLimitError';
  }
}

export class EntitlementError extends AppError {
  constructor(message: string = 'Entitlement not available on current plan') {
    super(message, 403, 'ENTITLEMENT_DENIED');
    this.name = 'EntitlementError';
  }
}

export class ProviderError extends AppError {
  public readonly provider: string;

  constructor(provider: string, message: string) {
    super(`Provider error (${provider}): ${message}`, 502, 'PROVIDER_ERROR');
    this.provider = provider;
    this.name = 'ProviderError';
  }
}

/**
 * Creates a consistent error response for API routes.
 * In production, never exposes stack traces, SQL, secrets, or internal paths.
 */
export function createErrorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: zodError.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  // Handle known auth/permission errors from existing code
  if (error instanceof Error) {
    if (error.message.startsWith('UNAUTHORIZED:')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: error.message } },
        { status: 401 }
      );
    }
    if (error.message.startsWith('FORBIDDEN:')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 }
      );
    }
  }

  // Generic server error — never expose internals
  logger.error('Unhandled error in API route', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}

// =============================================================================
// Structured Logger
// =============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getConfiguredLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || 'info').toLowerCase();
  if (env in LOG_LEVELS) return env as LogLevel;
  return 'info';
}

/**
 * Structured logger that outputs JSON in production and readable format in development.
 * Never logs passwords, API keys, session tokens, or authorization headers.
 */
class Logger {
  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const SENSITIVE_KEYS = [
      'password', 'passwordHash', 'secret', 'apiKey', 'api_key',
      'token', 'authorization', 'cookie', 'session', 'creditCard',
      'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'STRIPE_SECRET_KEY',
    ];
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[getConfiguredLevel()];
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data ? this.sanitize(data) : {}),
    };

    if (process.env.NODE_ENV === 'production') {
      // Structured JSON for production log aggregation
      const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      fn(JSON.stringify(entry));
    } else {
      // Human-readable for development
      const prefix = `[${level.toUpperCase()}]`;
      if (data) {
        console.log(`${prefix} ${message}`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }

  debug(message: string, data?: Record<string, unknown>) { this.log('debug', message, data); }
  info(message: string, data?: Record<string, unknown>) { this.log('info', message, data); }
  warn(message: string, data?: Record<string, unknown>) { this.log('warn', message, data); }
  error(message: string, data?: Record<string, unknown>) { this.log('error', message, data); }
}

export const logger = new Logger();

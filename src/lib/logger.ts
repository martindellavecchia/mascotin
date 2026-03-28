/**
 * Structured logger for mascoTin API routes.
 * Provides context-rich logging for debugging and monitoring.
 * Replace with Pino/Winston for production if needed.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const timestamp = new Date().toISOString();
  const logEntry: Record<string, unknown> = {
    timestamp,
    level,
    message,
    ...context,
  };

  if (error instanceof Error) {
    logEntry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (error !== undefined) {
    logEntry.error = error;
  }

  return logEntry;
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(JSON.stringify(formatLog('info', message, context)));
  },

  warn(message: string, context?: LogContext) {
    console.warn(JSON.stringify(formatLog('warn', message, context)));
  },

  error(message: string, context?: LogContext, error?: unknown) {
    console.error(JSON.stringify(formatLog('error', message, context, error)));
  },

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(JSON.stringify(formatLog('debug', message, context)));
    }
  },

  /** Create a logger scoped to a specific API route */
  forRoute(endpoint: string, method: string) {
    return {
      info: (message: string, ctx?: Omit<LogContext, 'endpoint' | 'method'>) =>
        logger.info(message, { endpoint, method, ...ctx }),
      warn: (message: string, ctx?: Omit<LogContext, 'endpoint' | 'method'>) =>
        logger.warn(message, { endpoint, method, ...ctx }),
      error: (message: string, error?: unknown, ctx?: Omit<LogContext, 'endpoint' | 'method'>) =>
        logger.error(message, { endpoint, method, ...ctx }, error),
      debug: (message: string, ctx?: Omit<LogContext, 'endpoint' | 'method'>) =>
        logger.debug(message, { endpoint, method, ...ctx }),
    };
  },
};

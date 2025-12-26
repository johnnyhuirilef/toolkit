import { Logger } from '@nestjs/common';
import { SHUTDOWN_EVENTS } from '../../constants/shutdown';

/**
 * Base log context with common fields.
 */
type LogContext = {
  readonly event: string;
  readonly [key: string]: unknown;
};

/**
 * Context for logging individual connection close events.
 */
type ConnectionCloseContext = {
  readonly token: string;
  readonly duration?: number;
  readonly error?: string;
  readonly stack?: string;
};

/**
 * Logger context name for all shutdown-related logs.
 */
const LOGGER_CONTEXT = 'TsValidMongoModule';

/**
 * Formats log context as structured JSON string.
 *
 * Pure function that converts context object to JSON.
 *
 * @param context - Log context to format
 * @returns JSON string representation
 */
const formatContext = (context: LogContext): string =>
  JSON.stringify(context, null, 2);

/**
 * Logs the start of the shutdown process.
 *
 * Emits structured log indicating how many connections will be closed.
 *
 * @param connectionCount - Number of connections to close
 *
 * @example
 * ```typescript
 * logShutdownStart(5);
 * // Logs: { event: "shutdown.start", connectionCount: 5, ... }
 * ```
 */
export const logShutdownStart = (connectionCount: number): void => {
  Logger.log(
    formatContext({
      event: SHUTDOWN_EVENTS.START,
      connectionCount,
      timestamp: new Date().toISOString(),
    }),
    LOGGER_CONTEXT
  );
};

/**
 * Logs the completion of the shutdown process.
 *
 * Emits structured log with statistics about closed connections.
 *
 * @param totalConnections - Total number of connections attempted
 * @param successCount - Number successfully closed
 * @param failureCount - Number that failed to close
 * @param durationMs - Total time taken in milliseconds
 *
 * @example
 * ```typescript
 * logShutdownComplete(5, 4, 1, 1234);
 * // Logs success/failure statistics
 * ```
 */
export const logShutdownComplete = (
  totalConnections: number,
  successCount: number,
  failureCount: number,
  durationMs: number
): void => {
  Logger.log(
    formatContext({
      event: SHUTDOWN_EVENTS.COMPLETE,
      totalConnections,
      successCount,
      failureCount,
      durationMs,
      timestamp: new Date().toISOString(),
    }),
    LOGGER_CONTEXT
  );
};

/**
 * Logs successful closure of a single connection.
 *
 * Emits structured log for connection close success.
 *
 * @param token - Connection token identifier
 * @param durationMs - Time taken to close in milliseconds
 *
 * @example
 * ```typescript
 * logConnectionClosed('primary-db', 234);
 * // Logs connection close with timing
 * ```
 */
export const logConnectionClosed = (token: string, durationMs: number): void => {
  Logger.log(
    formatContext({
      event: SHUTDOWN_EVENTS.CONNECTION_CLOSED,
      token,
      durationMs,
      timestamp: new Date().toISOString(),
    }),
    LOGGER_CONTEXT
  );
};

/**
 * Logs failed closure of a single connection.
 *
 * Emits structured error log with failure details.
 *
 * @param context - Connection close failure context
 *
 * @example
 * ```typescript
 * logConnectionFailed({
 *   token: 'test-db',
 *   error: 'Network error',
 *   stack: error.stack,
 * });
 * ```
 */
export const logConnectionFailed = (context: ConnectionCloseContext): void => {
  Logger.error(
    formatContext({
      event: SHUTDOWN_EVENTS.CONNECTION_FAILED,
      ...context,
      timestamp: new Date().toISOString(),
    }),
    LOGGER_CONTEXT
  );
};

/**
 * Logs shutdown timeout event.
 *
 * Emits structured error log when shutdown exceeds timeout.
 *
 * @param timeoutMs - The timeout value that was exceeded
 *
 * @example
 * ```typescript
 * logShutdownTimeout(10000);
 * // Logs timeout error
 * ```
 */
export const logShutdownTimeout = (timeoutMs: number): void => {
  Logger.error(
    formatContext({
      event: SHUTDOWN_EVENTS.TIMEOUT,
      timeoutMs,
      timestamp: new Date().toISOString(),
    }),
    LOGGER_CONTEXT
  );
};

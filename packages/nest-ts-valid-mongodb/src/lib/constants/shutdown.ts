/**
 * Default configuration values for graceful shutdown behavior.
 *
 * These constants define sensible defaults that work for most applications.
 * They can be overridden via module configuration options.
 *
 * @example
 * ```typescript
 * import { SHUTDOWN_DEFAULTS } from './constants/shutdown';
 *
 * const timeout = config.shutdownTimeout ?? SHUTDOWN_DEFAULTS.TIMEOUT_MS;
 * ```
 */
export const SHUTDOWN_DEFAULTS = {
  /**
   * Default maximum time to wait for all connections to close gracefully.
   * After 10 seconds, the shutdown process will complete regardless.
   */
  TIMEOUT_MS: 10_000,

  /**
   * Default behavior is to wait for graceful close, not force immediate shutdown.
   */
  FORCE_CLOSE: false,

  /**
   * Number of retry attempts when closing a connection fails.
   * Helps recover from temporary network issues.
   */
  RETRY_ATTEMPTS: 2,

  /**
   * Base delay in milliseconds between retry attempts.
   * Uses exponential backoff: delay * 2^attempt
   */
  RETRY_DELAY_MS: 100,
} as const;

/**
 * Event names for structured logging during shutdown lifecycle.
 *
 * Use these constants for consistent event naming in logs.
 * Enables easy filtering and alerting in log aggregation tools.
 *
 * @example
 * ```typescript
 * import { SHUTDOWN_EVENTS } from './constants/shutdown';
 *
 * Logger.log({
 *   event: SHUTDOWN_EVENTS.START,
 *   connectionCount: 5,
 * });
 * ```
 */
export const SHUTDOWN_EVENTS = {
  /**
   * Emitted when graceful shutdown process begins.
   */
  START: 'shutdown.start',

  /**
   * Emitted when all connections have been closed successfully.
   */
  COMPLETE: 'shutdown.complete',

  /**
   * Emitted when an error occurs during shutdown.
   */
  ERROR: 'shutdown.error',

  /**
   * Emitted when shutdown exceeds the configured timeout.
   */
  TIMEOUT: 'shutdown.timeout',

  /**
   * Emitted when a single connection is closed successfully.
   */
  CONNECTION_CLOSED: 'connection.closed',

  /**
   * Emitted when a connection fails to close.
   */
  CONNECTION_FAILED: 'connection.close.failed',
} as const;

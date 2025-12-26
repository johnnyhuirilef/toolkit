import { SHUTDOWN_DEFAULTS } from '../../constants/shutdown';

/**
 * Configuration for timeout wrapper.
 */
type TimeoutConfig = {
  readonly timeoutMs: number;
  readonly operation: string;
};

/**
 * Custom error thrown when an operation exceeds its timeout.
 *
 * Extends Error with context about which operation timed out.
 *
 * @example
 * ```typescript
 * throw new ShutdownTimeoutError('connection.close', 5000);
 * // Error: connection.close exceeded timeout of 5000ms
 * ```
 */
export class ShutdownTimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} exceeded timeout of ${timeoutMs}ms`);
    this.name = 'ShutdownTimeoutError';
  }
}

/**
 * Wraps a promise with a timeout, racing against a timeout promise.
 *
 * Uses declarative Promise.race pattern with early rejection.
 * Returns the original promise's result if it completes within timeout.
 *
 * @param promise - The promise to wrap with timeout
 * @param config - Timeout configuration with duration and operation name
 * @returns Promise that resolves/rejects based on the race result
 * @throws {ShutdownTimeoutError} When timeout is exceeded
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   closeConnection(),
 *   { timeoutMs: 5000, operation: 'close' }
 * );
 * ```
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  config: TimeoutConfig
): Promise<T> => {
  const { timeoutMs, operation } = config;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new ShutdownTimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

/**
 * Resolves the timeout value to use, applying validation and defaults.
 *
 * Uses early returns and guard clauses for low cyclomatic complexity.
 * Returns default if user value is undefined or invalid.
 *
 * @param userTimeout - Optional timeout value from user configuration
 * @returns Valid timeout in milliseconds (always positive number)
 *
 * @example
 * ```typescript
 * const timeout = getShutdownTimeout(config.shutdownTimeout);
 * // Returns user value if valid, otherwise SHUTDOWN_DEFAULTS.TIMEOUT_MS
 * ```
 */
export const getShutdownTimeout = (userTimeout?: number): number => {
  if (userTimeout === undefined) {
    return SHUTDOWN_DEFAULTS.TIMEOUT_MS;
  }

  if (userTimeout < 0) {
    return SHUTDOWN_DEFAULTS.TIMEOUT_MS;
  }

  if (!Number.isFinite(userTimeout)) {
    return SHUTDOWN_DEFAULTS.TIMEOUT_MS;
  }

  return userTimeout;
};

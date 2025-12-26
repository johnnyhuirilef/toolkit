import { SHUTDOWN_DEFAULTS } from '../../constants/shutdown';

/**
 * Configuration for retry behavior.
 */
type RetryConfig = {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly operation: string;
};

/**
 * Result of a retry operation, indicating success or failure.
 *
 * This type allows for functional error handling without throwing.
 */
type RetryResult<T> = {
  readonly success: boolean;
  readonly value?: T;
  readonly error?: Error;
  readonly attempts: number;
};

/**
 * Delays execution for specified milliseconds.
 *
 * Pure utility function for async delay.
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 *
 * @example
 * ```typescript
 * await delay(100); // Wait 100ms
 * ```
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calculates exponential backoff delay.
 *
 * Uses formula: baseDelayMs * 2^attempt
 * Pure function with no side effects.
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param baseDelayMs - Base delay in milliseconds
 * @returns Calculated backoff delay in milliseconds
 *
 * @example
 * ```typescript
 * calculateBackoff(0, 100); // 100ms
 * calculateBackoff(1, 100); // 200ms
 * calculateBackoff(2, 100); // 400ms
 * ```
 */
const calculateBackoff = (attempt: number, baseDelayMs: number): number =>
  baseDelayMs * Math.pow(2, attempt);

/**
 * Retries an operation with exponential backoff.
 *
 * Returns a result object instead of throwing, enabling functional error handling.
 * Uses early break on last attempt to avoid unnecessary delay.
 *
 * @param operation - Async operation to retry
 * @param config - Retry configuration
 * @returns Result indicating success/failure with metadata
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => connection.close(),
 *   { maxAttempts: 3, delayMs: 100, operation: 'close' }
 * );
 *
 * if (result.success) {
 *   console.log('Closed after', result.attempts, 'attempts');
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<RetryResult<T>> => {
  const { maxAttempts, delayMs } = config;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const value = await operation();
      return {
        success: true,
        value,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isLastAttempt = attempt === maxAttempts - 1;

      if (isLastAttempt) {
        break;
      }

      const backoffMs = calculateBackoff(attempt, delayMs);
      await delay(backoffMs);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
  };
};

/**
 * Resolves retry configuration, applying defaults.
 *
 * Uses early return pattern for clean control flow.
 * Returns configuration object with validated values.
 *
 * @param userRetries - Optional retry count from user configuration
 * @returns Retry configuration with maxAttempts and delayMs
 *
 * @example
 * ```typescript
 * const config = getRetryConfig(config.retries);
 * // Returns { maxAttempts: 2, delayMs: 100 } by default
 * ```
 */
export const getRetryConfig = (
  userRetries?: number
): Pick<RetryConfig, 'maxAttempts' | 'delayMs'> => {
  if (userRetries === undefined) {
    return {
      maxAttempts: SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS,
      delayMs: SHUTDOWN_DEFAULTS.RETRY_DELAY_MS,
    };
  }

  if (userRetries < 0) {
    return {
      maxAttempts: SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS,
      delayMs: SHUTDOWN_DEFAULTS.RETRY_DELAY_MS,
    };
  }

  if (!Number.isFinite(userRetries)) {
    return {
      maxAttempts: SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS,
      delayMs: SHUTDOWN_DEFAULTS.RETRY_DELAY_MS,
    };
  }

  return {
    maxAttempts: userRetries,
    delayMs: SHUTDOWN_DEFAULTS.RETRY_DELAY_MS,
  };
};

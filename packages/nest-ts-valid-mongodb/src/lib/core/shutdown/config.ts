import { SHUTDOWN_DEFAULTS } from '../../constants/shutdown';
import type { TsValidMongoConnectionOptions } from '../../interfaces';

/**
 * Resolved shutdown configuration with validated values.
 */
export type ShutdownConfig = {
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly forceClose: boolean;
};

/**
 * Validates if a value is a valid timeout number.
 *
 * Uses early return pattern for clean validation.
 *
 * @param value - Value to validate
 * @returns True if value is a positive finite number
 */
const isValidTimeout = (value: unknown): value is number => {
  if (typeof value !== 'number') {
    return false;
  }

  if (value < 0) {
    return false;
  }

  if (!Number.isFinite(value)) {
    return false;
  }

  return true;
};

/**
 * Validates if a value is a valid retry count.
 *
 * Uses early return pattern for clean validation.
 *
 * @param value - Value to validate
 * @returns True if value is a non-negative finite number
 */
const isValidRetries = (value: unknown): value is number => {
  if (typeof value !== 'number') {
    return false;
  }

  if (value < 0) {
    return false;
  }

  if (!Number.isFinite(value)) {
    return false;
  }

  return true;
};

/**
 * Resolves shutdown configuration from user options.
 *
 * Applies validation and defaults declaratively.
 * Uses early returns for clean control flow.
 *
 * @param options - User-provided connection options (optional)
 * @returns Validated shutdown configuration
 *
 * @example
 * ```typescript
 * const config = resolveShutdownConfig({
 *   shutdownTimeout: 5000,
 *   forceShutdown: false,
 * });
 * // Returns: { timeoutMs: 5000, retryAttempts: 2, forceClose: false }
 * ```
 */
export const resolveShutdownConfig = (
  options?: TsValidMongoConnectionOptions
): ShutdownConfig => {
  const userTimeout = options?.shutdownTimeout;
  const timeoutMs = isValidTimeout(userTimeout)
    ? userTimeout
    : SHUTDOWN_DEFAULTS.TIMEOUT_MS;

  const retryAttempts = SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS;
  const forceClose = options?.forceShutdown ?? SHUTDOWN_DEFAULTS.FORCE_CLOSE;

  return {
    timeoutMs,
    retryAttempts,
    forceClose,
  };
};

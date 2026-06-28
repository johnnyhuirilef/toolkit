import { SHUTDOWN_DEFAULTS } from '../../constants/shutdown';
import type { TsValidMongoConnectionOptions } from '../../interfaces';
import type { MongoDatabaseClientWrapper } from '../client';

// --- CONFIGURATION ---

export type ShutdownConfig = {
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly forceClose: boolean;
};

export const resolveShutdownConfig = (options?: TsValidMongoConnectionOptions): ShutdownConfig => ({
  timeoutMs:
    typeof options?.shutdownTimeout === 'number' &&
    options.shutdownTimeout >= 0 &&
    Number.isFinite(options.shutdownTimeout)
      ? options.shutdownTimeout
      : SHUTDOWN_DEFAULTS.TIMEOUT_MS,
  retryAttempts: SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS,
  forceClose: options?.forceShutdown ?? SHUTDOWN_DEFAULTS.FORCE_CLOSE,
});

// --- GUARDS ---

export const isValidConnectionWrapper = (value: unknown): value is MongoDatabaseClientWrapper =>
  typeof value === 'object' &&
  value !== null &&
  'close' in value &&
  typeof (value as { close: unknown }).close === 'function' &&
  'client' in value;

// --- TIMEOUT ---

export class ShutdownTimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} exceeded timeout of ${String(timeoutMs)}ms`);
    this.name = 'ShutdownTimeoutError';
  }
}

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> => {
  let timerId: ReturnType<typeof setTimeout>;

  return Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      timerId = setTimeout(() => {
        reject(new ShutdownTimeoutError(operation, timeoutMs));
      }, timeoutMs);
    }),
  ]).finally(() => {
    clearTimeout(timerId);
  });
};

// --- RETRY ---

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  operation: () => Promise<T>,
  remainingAttempts: number,
  delayMs = SHUTDOWN_DEFAULTS.RETRY_DELAY_MS,
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (remainingAttempts <= 1) throw error;
    await delay(delayMs);
    return withRetry(operation, remainingAttempts - 1, delayMs * 2);
  }
};

import { SHUTDOWN_DEFAULTS } from '../../constants/shutdown';
import type { TsValidMongoConnectionOptions } from '../../interfaces';
import type { MongoDatabaseClientWrapper } from '../client';

// --- CONFIGURATION ---

export type ShutdownConfig = {
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly forceClose: boolean;
};

export const resolveShutdownConfig = (options?: TsValidMongoConnectionOptions): ShutdownConfig => {
  const userTimeout = options?.shutdownTimeout;
  const timeoutMs =
    typeof userTimeout === 'number' && userTimeout >= 0 && Number.isFinite(userTimeout)
      ? userTimeout
      : SHUTDOWN_DEFAULTS.TIMEOUT_MS;

  const retryAttempts = SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS;
  const forceClose = options?.forceShutdown ?? SHUTDOWN_DEFAULTS.FORCE_CLOSE;

  return { timeoutMs, retryAttempts, forceClose };
};

// --- GUARDS ---

export const isValidConnectionWrapper = (value: unknown): value is MongoDatabaseClientWrapper => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'close' in value &&
    typeof (value as { close: unknown }).close === 'function' &&
    'client' in value
  );
};

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
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    setTimeout(() => {
      reject(new ShutdownTimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

// --- RETRY ---

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number,
): Promise<{ success: boolean; value?: T; error?: Error }> => {
  let lastError: Error | undefined;
  const delayMs = SHUTDOWN_DEFAULTS.RETRY_DELAY_MS;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const value = await operation();
      return { success: true, value };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxAttempts - 1) break;
      await delay(delayMs * Math.pow(2, attempt));
    }
  }

  return { success: false, error: lastError };
};

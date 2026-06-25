import type { ZodMongoOptions } from '../zod-mongo.interfaces';

export type ShutdownConfig = {
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly forceClose: boolean;
};

const DEFAULTS = Object.freeze({
  timeoutMs: 10_000,
  retryAttempts: 2,
  forceClose: false,
});

const isValidTimeout = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export const resolveShutdownConfig = (options?: ZodMongoOptions): ShutdownConfig => ({
  timeoutMs: isValidTimeout(options?.shutdownTimeoutMs)
    ? options.shutdownTimeoutMs
    : DEFAULTS.timeoutMs,
  retryAttempts: options?.shutdownRetryAttempts ?? DEFAULTS.retryAttempts,
  forceClose: options?.forceShutdown ?? DEFAULTS.forceClose,
});

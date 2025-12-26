import { describe, it, expect } from 'vitest';
import {
  withTimeout,
  getShutdownTimeout,
  ShutdownTimeoutError,
} from '../../../src/lib/core/shutdown/timeout';
import { SHUTDOWN_DEFAULTS } from '../../../src/lib/constants/shutdown';

describe('ShutdownTimeoutError', () => {
  it('creates error with operation and timeout in message', () => {
    const error = new ShutdownTimeoutError('test.operation', 5000);

    expect(error.message).toBe('test.operation exceeded timeout of 5000ms');
    expect(error.name).toBe('ShutdownTimeoutError');
  });

  it('is instance of Error', () => {
    const error = new ShutdownTimeoutError('test', 1000);

    expect(error).toBeInstanceOf(Error);
  });
});

describe('withTimeout', () => {
  it('resolves if promise completes before timeout', async () => {
    const promise = Promise.resolve(42);

    const result = await withTimeout(promise, {
      timeoutMs: 1000,
      operation: 'test',
    });

    expect(result).toBe(42);
  });

  it('resolves with complex values', async () => {
    const data = { success: true, value: 'test' };
    const promise = Promise.resolve(data);

    const result = await withTimeout(promise, {
      timeoutMs: 1000,
      operation: 'test',
    });

    expect(result).toEqual(data);
  });

  it('rejects with ShutdownTimeoutError if timeout exceeded', async () => {
    const promise = new Promise(() => {}); // Never resolves

    await expect(
      withTimeout(promise, {
        timeoutMs: 100,
        operation: 'test.operation',
      })
    ).rejects.toThrow('test.operation exceeded timeout of 100ms');
  });

  it('rejects with ShutdownTimeoutError instance', async () => {
    const promise = new Promise(() => {});

    await expect(
      withTimeout(promise, {
        timeoutMs: 50,
        operation: 'test',
      })
    ).rejects.toBeInstanceOf(ShutdownTimeoutError);
  });

  it('propagates original promise rejection', async () => {
    const error = new Error('Original error');
    const promise = Promise.reject(error);

    await expect(
      withTimeout(promise, {
        timeoutMs: 1000,
        operation: 'test',
      })
    ).rejects.toThrow('Original error');
  });

  it('handles very short timeouts', async () => {
    const promise = new Promise(() => {});

    const start = Date.now();
    await expect(
      withTimeout(promise, {
        timeoutMs: 10,
        operation: 'fast',
      })
    ).rejects.toThrow();
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50);
  });
});

describe('getShutdownTimeout', () => {
  it('returns default when undefined', () => {
    const timeout = getShutdownTimeout(undefined);

    expect(timeout).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
    expect(timeout).toBe(10000);
  });

  it('returns default when not provided', () => {
    const timeout = getShutdownTimeout();

    expect(timeout).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
  });

  it('returns default when negative', () => {
    const timeout = getShutdownTimeout(-1);

    expect(timeout).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
  });

  it('returns default when negative large number', () => {
    const timeout = getShutdownTimeout(-9999);

    expect(timeout).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
  });

  it('returns default when NaN', () => {
    const timeout = getShutdownTimeout(NaN);

    expect(timeout).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
  });

  it('returns default when Infinity', () => {
    const timeout = getShutdownTimeout(Infinity);

    expect(timeout).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
  });

  it('returns default when -Infinity', () => {
    const timeout = getShutdownTimeout(-Infinity);

    expect(timeout).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
  });

  it('returns user value when valid positive number', () => {
    const timeout = getShutdownTimeout(5000);

    expect(timeout).toBe(5000);
  });

  it('returns user value when zero', () => {
    const timeout = getShutdownTimeout(0);

    expect(timeout).toBe(0);
  });

  it('accepts large valid timeouts', () => {
    const timeout = getShutdownTimeout(60000);

    expect(timeout).toBe(60000);
  });
});

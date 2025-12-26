import { describe, it, expect, vi } from 'vitest';
import { withRetry, getRetryConfig } from '../../../src/lib/core/shutdown/retry';
import { SHUTDOWN_DEFAULTS } from '../../../src/lib/constants/shutdown';

describe('withRetry', () => {
  it('succeeds on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue(42);

    const result = await withRetry(operation, {
      maxAttempts: 3,
      delayMs: 10,
      operation: 'test',
    });

    expect(result.success).toBe(true);
    expect(result.value).toBe(42);
    expect(result.attempts).toBe(1);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('succeeds with complex return values', async () => {
    const data = { id: 123, name: 'test' };
    const operation = vi.fn().mockResolvedValue(data);

    const result = await withRetry(operation, {
      maxAttempts: 2,
      delayMs: 10,
      operation: 'test',
    });

    expect(result.success).toBe(true);
    expect(result.value).toEqual(data);
  });

  it('retries on failure and eventually succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue(42);

    const result = await withRetry(operation, {
      maxAttempts: 3,
      delayMs: 10,
      operation: 'test',
    });

    expect(result.success).toBe(true);
    expect(result.value).toBe(42);
    expect(result.attempts).toBe(3);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('returns failure after max attempts exhausted', async () => {
    const error = new Error('Persistent failure');
    const operation = vi.fn().mockRejectedValue(error);

    const result = await withRetry(operation, {
      maxAttempts: 2,
      delayMs: 10,
      operation: 'test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toEqual(error);
    expect(result.attempts).toBe(2);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('converts non-Error rejections to Error', async () => {
    const operation = vi.fn().mockRejectedValue('string error');

    const result = await withRetry(operation, {
      maxAttempts: 1,
      delayMs: 10,
      operation: 'test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('string error');
  });

  it('applies exponential backoff between retries', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue('success');

    const start = Date.now();

    await withRetry(operation, {
      maxAttempts: 3,
      delayMs: 50,
      operation: 'test',
    });

    const duration = Date.now() - start;

    // First retry: 50ms backoff
    // Second retry: 100ms backoff
    // Total: ~150ms minimum
    expect(duration).toBeGreaterThanOrEqual(130);
  });

  it('does not delay after last attempt', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Fail'));

    const start = Date.now();

    await withRetry(operation, {
      maxAttempts: 2,
      delayMs: 100,
      operation: 'test',
    });

    const duration = Date.now() - start;

    // Only one delay of 100ms (no delay after 2nd attempt)
    expect(duration).toBeLessThan(150);
  });

  it('handles single attempt without retry', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withRetry(operation, {
      maxAttempts: 1,
      delayMs: 10,
      operation: 'test',
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('handles zero delay', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue('success');

    const start = Date.now();

    await withRetry(operation, {
      maxAttempts: 2,
      delayMs: 0,
      operation: 'test',
    });

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50);
  });
});

describe('getRetryConfig', () => {
  it('returns defaults when undefined', () => {
    const config = getRetryConfig(undefined);

    expect(config.maxAttempts).toBe(SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS);
    expect(config.delayMs).toBe(SHUTDOWN_DEFAULTS.RETRY_DELAY_MS);
    expect(config.maxAttempts).toBe(2);
    expect(config.delayMs).toBe(100);
  });

  it('returns defaults when not provided', () => {
    const config = getRetryConfig();

    expect(config.maxAttempts).toBe(SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS);
    expect(config.delayMs).toBe(SHUTDOWN_DEFAULTS.RETRY_DELAY_MS);
  });

  it('returns defaults when negative', () => {
    const config = getRetryConfig(-1);

    expect(config.maxAttempts).toBe(SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS);
  });

  it('returns defaults when NaN', () => {
    const config = getRetryConfig(NaN);

    expect(config.maxAttempts).toBe(SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS);
  });

  it('returns defaults when Infinity', () => {
    const config = getRetryConfig(Infinity);

    expect(config.maxAttempts).toBe(SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS);
  });

  it('returns user value when valid', () => {
    const config = getRetryConfig(5);

    expect(config.maxAttempts).toBe(5);
    expect(config.delayMs).toBe(100);
  });

  it('accepts zero retries', () => {
    const config = getRetryConfig(0);

    expect(config.maxAttempts).toBe(0);
  });

  it('accepts large retry counts', () => {
    const config = getRetryConfig(10);

    expect(config.maxAttempts).toBe(10);
  });
});

import { describe, it, expect, vi } from 'vitest';

import { withRetry } from '../../src/shutdown/retry';

describe('withRetry', () => {
  it('returns ok on first successful attempt', async () => {
    const operation = vi.fn().mockResolvedValue('done');
    const result = await withRetry(operation, 3);
    expect(result).toMatchObject({ ok: true, value: 'done' });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and returns ok after eventual success', async () => {
    const operation = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');
    const result = await withRetry(operation, 3, 0);
    expect(result).toMatchObject({ ok: true, value: 'success' });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('returns err when all attempts exhausted', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('permanent failure'));
    const result = await withRetry(operation, 2, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('unknown');
      expect(result.error.message).toContain('permanent failure');
    }
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('returns err immediately when attemptsLeft is 0', async () => {
    const operation = vi.fn().mockResolvedValue('should not be called');
    const result = await withRetry(operation, 0);
    expect(result.ok).toBe(false);
    expect(operation).not.toHaveBeenCalled();
  });

  it('applies exponential backoff (delay increases per retry)', async () => {
    vi.useFakeTimers();
    const operation = vi.fn().mockRejectedValue(new Error('fail'));
    const promise = withRetry(operation, 3, 100);
    // advanceTimersByTimeAsync flushes microtasks after advancing so each .then() chain resolves
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    expect(result.ok).toBe(false);
    expect(operation).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});

import { describe, it, expect, vi } from 'vitest';

import { withTimeout, ShutdownTimeoutError } from '../../src/shutdown/timeout';

describe('withTimeout', () => {
  it('resolves when promise completes before timeout', async () => {
    const fast = Promise.resolve(42);
    const result = await withTimeout(fast, 1000, 'test-op');
    expect(result).toBe(42);
  });

  it('rejects with ShutdownTimeoutError when promise exceeds timeout', async () => {
    vi.useFakeTimers();
    const slow = new Promise<never>(() => {
      // never resolves
    });
    const racePromise = withTimeout(slow, 100, 'slow-op');
    vi.advanceTimersByTime(200);
    await expect(racePromise).rejects.toBeInstanceOf(ShutdownTimeoutError);
    vi.useRealTimers();
  });

  it('ShutdownTimeoutError has correct name', async () => {
    vi.useFakeTimers();
    const slow = new Promise<never>(() => undefined);
    const racePromise = withTimeout(slow, 50, 'my-op');
    vi.advanceTimersByTime(100);
    await expect(racePromise).rejects.toMatchObject({
      name: 'ShutdownTimeoutError',
      message: expect.stringContaining('my-op'),
    });
    vi.useRealTimers();
  });
});

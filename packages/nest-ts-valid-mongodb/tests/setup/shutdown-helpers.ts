/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, unicorn/prevent-abbreviations */
/* cspell:disable */
import { vi } from 'vitest';

import type { MongoDatabaseClientWrapper } from '../../src/lib/core/client';

/**
 * Creates a mock MongoDatabaseClientWrapper that resolves successfully.
 *
 * Use this for testing happy path scenarios where connections close cleanly.
 *
 * @param overrides - Optional properties to override in the mock
 * @returns A valid mock wrapper with working close() method
 *
 * @example
 * ```typescript
 * const wrapper = createMockWrapper();
 * await wrapper.close(); // Resolves successfully
 * expect(wrapper.close).toHaveBeenCalled();
 * ```
 */
export const createMockWrapper = (
  overrides?: Partial<MongoDatabaseClientWrapper>,
): MongoDatabaseClientWrapper => ({
  client: {} as any,
  close: vi.fn().mockResolvedValue(),
  ...overrides,
});

/**
 * Creates a mock wrapper that never resolves (hangs indefinitely).
 *
 * Use this for testing timeout scenarios during shutdown.
 *
 * @returns A wrapper whose close() method never completes
 *
 * @example
 * ```typescript
 * const wrapper = createHangingWrapper();
 * // This promise will never resolve
 * await wrapper.close();
 * ```
 */
export const createHangingWrapper = (): MongoDatabaseClientWrapper => ({
  client: {} as any,
  close: vi.fn().mockImplementation(
    () =>
      new Promise(() => {
        /* Never resolves */
      }),
  ),
});

/**
 * Creates a mock wrapper that rejects with an error.
 *
 * Use this for testing error handling during connection close.
 *
 * @param error - The error to reject with (defaults to generic error)
 * @returns A wrapper whose close() method always fails
 *
 * @example
 * ```typescript
 * const wrapper = createFailingWrapper(new Error('Network error'));
 * await expect(wrapper.close()).rejects.toThrow('Network error');
 * ```
 */
export const createFailingWrapper = (
  error: Error = new Error('Connection close failed'),
): MongoDatabaseClientWrapper => ({
  client: {} as any,
  close: vi.fn().mockRejectedValue(error),
});

/**
 * Creates a wrapper that fails N times before succeeding.
 *
 * Use this for testing retry logic during shutdown.
 *
 * @param failCount - Number of times to fail before succeeding
 * @param error - The error to reject with during failures
 * @returns A wrapper that eventually succeeds after failCount attempts
 *
 * @example
 * ```typescript
 * const wrapper = createRetryableWrapper(2);
 * await expect(wrapper.close()).rejects.toThrow(); // 1st attempt
 * await expect(wrapper.close()).rejects.toThrow(); // 2nd attempt
 * await wrapper.close(); // 3rd attempt - succeeds
 * ```
 */
export const createRetryableWrapper = (
  failCount: number,
  error: Error = new Error('Temporary failure'),
): MongoDatabaseClientWrapper => {
  let attempts = 0;

  return {
    client: {} as any,
    close: vi.fn().mockImplementation(() => {
      attempts++;

      if (attempts <= failCount) {
        return Promise.reject(error);
      }

      return Promise.resolve();
    }),
  };
};

/**
 * Creates a wrapper that closes slowly (with delay).
 *
 * Use this for testing performance and timing scenarios.
 *
 * @param delayMs - Time in milliseconds to wait before resolving
 * @returns A wrapper that delays before closing
 *
 * @example
 * ```typescript
 * const wrapper = createSlowWrapper(1000);
 * const start = Date.now();
 * await wrapper.close();
 * const duration = Date.now() - start;
 * expect(duration).toBeGreaterThanOrEqual(1000);
 * ```
 */
export const createSlowWrapper = (delayMs: number): MongoDatabaseClientWrapper => ({
  client: {} as any,
  close: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, delayMs))),
});

/**
 * Utility to wait for a specific amount of time.
 *
 * Use this in tests to simulate delays or wait for async operations.
 *
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after the delay
 *
 * @example
 * ```typescript
 * await waitForTime(100);
 * // 100ms have elapsed
 * ```
 */
export const waitForTime = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates an array of mock wrappers for testing multiple connections.
 *
 * Use this for testing parallel shutdown of multiple connections.
 *
 * @param count - Number of wrappers to create
 * @returns Array of mock wrappers
 *
 * @example
 * ```typescript
 * const wrappers = createMultipleWrappers(5);
 * await Promise.all(wrappers.map(w => w.close()));
 * wrappers.forEach(w => expect(w.close).toHaveBeenCalled());
 * ```
 */
export const createMultipleWrappers = (count: number): MongoDatabaseClientWrapper[] =>
  Array.from({ length: count }, () => createMockWrapper());

/**
 * Creates a mixed set of wrappers for comprehensive testing.
 *
 * Includes successful, failing, and slow wrappers to simulate real scenarios.
 *
 * @param config - Configuration for wrapper mix
 * @returns Array of various wrapper types
 *
 * @example
 * ```typescript
 * const wrappers = createMixedWrappers({
 *   success: 3,
 *   failing: 1,
 *   slow: 1,
 *   });
 * // Returns 5 wrappers: 3 successful, 1 failing, 1 slow
 * ```
 */
export const createMixedWrappers = (config: {
  success: number;
  failing?: number;
  slow?: number;
  slowDelayMs?: number;
}): MongoDatabaseClientWrapper[] => {
  const wrappers: MongoDatabaseClientWrapper[] = [];

  for (let i = 0; i < config.success; i++) {
    wrappers.push(createMockWrapper());
  }

  if (config.failing) {
    for (let i = 0; i < config.failing; i++) {
      wrappers.push(createFailingWrapper());
    }
  }

  if (config.slow) {
    const delay = config.slowDelayMs ?? 100;
    for (let i = 0; i < config.slow; i++) {
      wrappers.push(createSlowWrapper(delay));
    }
  }

  return wrappers;
};

/* eslint-enable */

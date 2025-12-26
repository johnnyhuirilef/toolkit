import { describe, it, expect } from 'vitest';
import {
  createMockWrapper,
  createHangingWrapper,
  createFailingWrapper,
  createRetryableWrapper,
  createSlowWrapper,
  waitForTime,
  createMultipleWrappers,
  createMixedWrappers,
} from '../setup/shutdown-helpers';

describe('Shutdown Test Helpers', () => {
  describe('createMockWrapper', () => {
    it('creates wrapper with successful close', async () => {
      const wrapper = createMockWrapper();

      await expect(wrapper.close()).resolves.toBeUndefined();
      expect(wrapper.close).toHaveBeenCalled();
    });

    it('allows overriding properties', () => {
      const customClient = { custom: true };
      const wrapper = createMockWrapper({ client: customClient as any });

      expect(wrapper.client).toEqual(customClient);
    });
  });

  describe('createHangingWrapper', () => {
    it('creates wrapper that never resolves', async () => {
      const wrapper = createHangingWrapper();

      const raceResult = await Promise.race([
        wrapper.close(),
        Promise.resolve('timeout'),
      ]);

      expect(raceResult).toBe('timeout');
    });
  });

  describe('createFailingWrapper', () => {
    it('creates wrapper that rejects with default error', async () => {
      const wrapper = createFailingWrapper();

      await expect(wrapper.close()).rejects.toThrow('Connection close failed');
    });

    it('creates wrapper that rejects with custom error', async () => {
      const customError = new Error('Custom error');
      const wrapper = createFailingWrapper(customError);

      await expect(wrapper.close()).rejects.toThrow('Custom error');
    });
  });

  describe('createRetryableWrapper', () => {
    it('fails specified times then succeeds', async () => {
      const wrapper = createRetryableWrapper(2);

      await expect(wrapper.close()).rejects.toThrow('Temporary failure');
      await expect(wrapper.close()).rejects.toThrow('Temporary failure');
      await expect(wrapper.close()).resolves.toBeUndefined();
    });

    it('uses custom error for failures', async () => {
      const customError = new Error('Network hiccup');
      const wrapper = createRetryableWrapper(1, customError);

      await expect(wrapper.close()).rejects.toThrow('Network hiccup');
      await expect(wrapper.close()).resolves.toBeUndefined();
    });
  });

  describe('createSlowWrapper', () => {
    it('delays before resolving', async () => {
      const wrapper = createSlowWrapper(100);
      const start = Date.now();

      await wrapper.close();

      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(90); // Allow small margin
    });
  });

  describe('waitForTime', () => {
    it('waits for specified duration', async () => {
      const start = Date.now();

      await waitForTime(50);

      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(40); // Allow margin
    });
  });

  describe('createMultipleWrappers', () => {
    it('creates specified number of wrappers', () => {
      const wrappers = createMultipleWrappers(5);

      expect(wrappers).toHaveLength(5);
    });

    it('all wrappers close successfully', async () => {
      const wrappers = createMultipleWrappers(3);

      await Promise.all(wrappers.map((w) => w.close()));

      wrappers.forEach((w) => {
        expect(w.close).toHaveBeenCalled();
      });
    });
  });

  describe('createMixedWrappers', () => {
    it('creates only successful wrappers when specified', async () => {
      const wrappers = createMixedWrappers({ success: 3 });

      expect(wrappers).toHaveLength(3);

      await Promise.all(wrappers.map((w) => w.close()));

      wrappers.forEach((w) => {
        expect(w.close).toHaveBeenCalled();
      });
    });

    it('creates mix of successful and failing wrappers', async () => {
      const wrappers = createMixedWrappers({
        success: 2,
        failing: 1,
      });

      expect(wrappers).toHaveLength(3);

      const results = await Promise.allSettled(wrappers.map((w) => w.close()));

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(2);
      expect(rejected).toHaveLength(1);
    });

    it('creates mix with slow wrappers', async () => {
      const wrappers = createMixedWrappers({
        success: 1,
        slow: 1,
        slowDelayMs: 50,
      });

      expect(wrappers).toHaveLength(2);

      const start = Date.now();
      await Promise.all(wrappers.map((w) => w.close()));
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(40);
    });

    it('creates comprehensive mix', async () => {
      const wrappers = createMixedWrappers({
        success: 2,
        failing: 1,
        slow: 1,
        slowDelayMs: 30,
      });

      expect(wrappers).toHaveLength(4);
    });
  });
});

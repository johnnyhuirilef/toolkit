import { describe, it, expect, vi } from 'vitest';
import { 
  resolveShutdownConfig, 
  withRetry, 
  withTimeout, 
  ShutdownTimeoutError 
} from '../../../src/lib/core/shutdown/utils';
import { SHUTDOWN_DEFAULTS } from '../../../src/lib/constants/shutdown';

describe('Shutdown Utils', () => {
  describe('resolveShutdownConfig', () => {
    it('should return defaults when no options provided', () => {
      const config = resolveShutdownConfig();
      expect(config.timeoutMs).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
      expect(config.retryAttempts).toBe(SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS);
      expect(config.forceClose).toBe(SHUTDOWN_DEFAULTS.FORCE_CLOSE);
    });

    it('should respect user options', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: 5000,
        forceShutdown: true,
      } as any);
      expect(config.timeoutMs).toBe(5000);
      expect(config.forceClose).toBe(true);
    });

    it('should ignore invalid timeout values', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: -100,
      } as any);
      expect(config.timeoutMs).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
    });
  });

  describe('withTimeout', () => {
    it('should resolve if promise completes in time', async () => {
      const result = await withTimeout(Promise.resolve('ok'), 100, 'test');
      expect(result).toBe('ok');
    });

    it('should reject if promise times out', async () => {
      const slowPromise = new Promise(resolve => setTimeout(resolve, 50));
      // timeout is 10ms, so it should fail
      await expect(withTimeout(slowPromise, 10, 'test')).rejects.toThrow(ShutdownTimeoutError);
    });
  });

  describe('withRetry', () => {
    it('should return success on first try', async () => {
      const op = vi.fn().mockResolvedValue('ok');
      const result = await withRetry(op, 3);
      expect(result.success).toBe(true);
      expect(result.value).toBe('ok');
      expect(op).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const op = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValue('ok');
      
      const result = await withRetry(op, 3);
      expect(result.success).toBe(true);
      expect(result.value).toBe('ok');
      expect(op).toHaveBeenCalledTimes(2);
    });

    it('should return failure after max attempts', async () => {
      const op = vi.fn().mockRejectedValue(new Error('fail always'));
      const result = await withRetry(op, 2);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(op).toHaveBeenCalledTimes(2);
    });
  });
});

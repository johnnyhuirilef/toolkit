import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ModuleRef } from '@nestjs/core';
import { closeConnection, closeAllConnections } from '../../../src/lib/core/shutdown/orchestrator';
import {
  createMockWrapper,
  createFailingWrapper,
  createHangingWrapper,
  createRetryableWrapper,
} from '../../setup/shutdown-helpers';

describe('Connection Close Orchestrator', () => {
  let moduleRef: ModuleRef;

  beforeEach(() => {
    moduleRef = {
      get: vi.fn(),
    } as unknown as ModuleRef;
  });

  describe('closeConnection', () => {
    it('closes connection successfully', async () => {
      const mockWrapper = createMockWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(mockWrapper);

      const result = await closeConnection({
        token: 'test-token',
        moduleRef,
        timeoutMs: 5000,
        retryAttempts: 2,
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe('test-token');
      expect(mockWrapper.close).toHaveBeenCalled();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('returns failure when wrapper is null', async () => {
      vi.mocked(moduleRef.get).mockReturnValue(null);

      const result = await closeConnection({
        token: 'test-token',
        moduleRef,
        timeoutMs: 5000,
        retryAttempts: 2,
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid or missing wrapper');
      expect(result.durationMs).toBe(0);
    });

    it('returns failure when wrapper is invalid object', async () => {
      vi.mocked(moduleRef.get).mockReturnValue({} as any);

      const result = await closeConnection({
        token: 'test-token',
        moduleRef,
        timeoutMs: 5000,
        retryAttempts: 2,
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid or missing wrapper');
    });

    it('returns failure when moduleRef.get throws', async () => {
      vi.mocked(moduleRef.get).mockImplementation(() => {
        throw new Error('Provider not found');
      });

      const result = await closeConnection({
        token: 'test-token',
        moduleRef,
        timeoutMs: 5000,
        retryAttempts: 2,
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid or missing wrapper');
    });

    it('handles close errors gracefully', async () => {
      const error = new Error('Connection close failed');
      const mockWrapper = createFailingWrapper(error);
      vi.mocked(moduleRef.get).mockReturnValue(mockWrapper);

      const result = await closeConnection({
        token: 'test-token',
        moduleRef,
        timeoutMs: 5000,
        retryAttempts: 2,
      });

      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('retries on failure before giving up', async () => {
      const mockWrapper = createRetryableWrapper(1);
      vi.mocked(moduleRef.get).mockReturnValue(mockWrapper);

      const result = await closeConnection({
        token: 'test-token',
        moduleRef,
        timeoutMs: 5000,
        retryAttempts: 2,
      });

      expect(result.success).toBe(true);
      expect(mockWrapper.close).toHaveBeenCalledTimes(2);
    });

    it('times out if close takes too long', async () => {
      const mockWrapper = createHangingWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(mockWrapper);

      const result = await closeConnection({
        token: 'test-token',
        moduleRef,
        timeoutMs: 100,
        retryAttempts: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });

    it('measures duration correctly', async () => {
      const mockWrapper = createMockWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(mockWrapper);

      const start = Date.now();
      const result = await closeConnection({
        token: 'test-token',
        moduleRef,
        timeoutMs: 5000,
        retryAttempts: 2,
      });
      const actualDuration = Date.now() - start;

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThanOrEqual(actualDuration + 10);
    });

    it('handles symbol tokens correctly', async () => {
      const mockWrapper = createMockWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(mockWrapper);

      const symbolToken = Symbol('test-connection');
      const result = await closeConnection({
        token: symbolToken,
        moduleRef,
        timeoutMs: 5000,
        retryAttempts: 2,
      });

      expect(result.success).toBe(true);
      expect(result.token).toBe(symbolToken);
    });

    it('converts non-Error exceptions to Error', async () => {
      const mockWrapper = {
        client: {} as any,
        close: vi.fn().mockRejectedValue('string error'),
      };
      vi.mocked(moduleRef.get).mockReturnValue(mockWrapper);

      const result = await closeConnection({
        token: 'test-token',
        moduleRef,
        timeoutMs: 5000,
        retryAttempts: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('string error');
    });
  });

  describe('closeAllConnections', () => {
    it('closes multiple connections successfully', async () => {
      const wrapper1 = createMockWrapper();
      const wrapper2 = createMockWrapper();
      const wrapper3 = createMockWrapper();

      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(wrapper1)
        .mockReturnValueOnce(wrapper2)
        .mockReturnValueOnce(wrapper3);

      const results = await closeAllConnections(
        ['token1', 'token2', 'token3'],
        moduleRef,
        5000,
        2
      );

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(wrapper1.close).toHaveBeenCalled();
      expect(wrapper2.close).toHaveBeenCalled();
      expect(wrapper3.close).toHaveBeenCalled();
    });

    it('returns results in same order as input tokens', async () => {
      const wrapper1 = createMockWrapper();
      const wrapper2 = createMockWrapper();

      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(wrapper1)
        .mockReturnValueOnce(wrapper2);

      const results = await closeAllConnections(
        ['first', 'second'],
        moduleRef,
        5000,
        2
      );

      expect(results[0].token).toBe('first');
      expect(results[1].token).toBe('second');
    });

    it('continues closing other connections if one fails', async () => {
      const wrapper1 = createFailingWrapper();
      const wrapper2 = createMockWrapper();
      const wrapper3 = createMockWrapper();

      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(wrapper1)
        .mockReturnValueOnce(wrapper2)
        .mockReturnValueOnce(wrapper3);

      const results = await closeAllConnections(
        ['token1', 'token2', 'token3'],
        moduleRef,
        5000,
        2
      );

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });

    it('handles empty token array', async () => {
      const results = await closeAllConnections([], moduleRef, 5000, 2);

      expect(results).toHaveLength(0);
      expect(moduleRef.get).not.toHaveBeenCalled();
    });

    it('handles mix of valid and invalid wrappers', async () => {
      const validWrapper = createMockWrapper();

      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(validWrapper)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({} as any);

      const results = await closeAllConnections(
        ['valid', 'null', 'invalid'],
        moduleRef,
        5000,
        2
      );

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(false);
    });

    it('closes connections in parallel', async () => {
      const startTimes: number[] = [];
      const endTimes: number[] = [];

      const createTimedWrapper = () => ({
        client: {} as any,
        close: vi.fn().mockImplementation(async () => {
          startTimes.push(Date.now());
          await new Promise((resolve) => setTimeout(resolve, 50));
          endTimes.push(Date.now());
        }),
      });

      const wrapper1 = createTimedWrapper();
      const wrapper2 = createTimedWrapper();
      const wrapper3 = createTimedWrapper();

      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(wrapper1)
        .mockReturnValueOnce(wrapper2)
        .mockReturnValueOnce(wrapper3);

      const start = Date.now();
      await closeAllConnections(['t1', 't2', 't3'], moduleRef, 5000, 1);
      const totalDuration = Date.now() - start;

      // If parallel, should take ~50ms
      // If sequential, would take ~150ms
      expect(totalDuration).toBeLessThan(100);

      // All should start around the same time
      const startSpread = Math.max(...startTimes) - Math.min(...startTimes);
      expect(startSpread).toBeLessThan(20);
    });

    it('applies timeout to each connection independently', async () => {
      const hangingWrapper = createHangingWrapper();
      const quickWrapper = createMockWrapper();

      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(hangingWrapper)
        .mockReturnValueOnce(quickWrapper);

      const results = await closeAllConnections(
        ['hanging', 'quick'],
        moduleRef,
        100,
        1
      );

      expect(results[0].success).toBe(false);
      expect(results[0].error?.message).toContain('timeout');
      expect(results[1].success).toBe(true);
    });

    it('handles large number of connections', async () => {
      const wrappers = Array.from({ length: 20 }, () => createMockWrapper());

      wrappers.forEach((wrapper) => {
        vi.mocked(moduleRef.get).mockReturnValueOnce(wrapper);
      });

      const tokens = Array.from({ length: 20 }, (_, i) => `token-${i}`);
      const results = await closeAllConnections(tokens, moduleRef, 5000, 2);

      expect(results).toHaveLength(20);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ModuleRef } from '@nestjs/core';
import { executeShutdown } from '../../../src/lib/core/shutdown/service';
import { resolveShutdownConfig } from '../../../src/lib/core/shutdown/config';
import * as orchestrator from '../../../src/lib/core/shutdown/orchestrator';
import * as logger from '../../../src/lib/core/shutdown/logger';
import * as timeout from '../../../src/lib/core/shutdown/timeout';
import {
  createMockWrapper,
  createFailingWrapper,
  createHangingWrapper,
} from '../../setup/shutdown-helpers';

describe('Shutdown Service', () => {
  let moduleRef: ModuleRef;

  beforeEach(() => {
    moduleRef = {
      get: vi.fn(),
    } as unknown as ModuleRef;

    vi.clearAllMocks();
  });

  describe('executeShutdown', () => {
    it('returns empty summary when no tokens provided', async () => {
      const config = resolveShutdownConfig();
      const summary = await executeShutdown({
        tokens: [],
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary.totalConnections).toBe(0);
      expect(summary.successCount).toBe(0);
      expect(summary.failureCount).toBe(0);
      expect(summary.durationMs).toBe(0);
    });

    it('does not log when no tokens provided', async () => {
      const logSpy = vi.spyOn(logger, 'logShutdownStart');
      const config = resolveShutdownConfig();

      await executeShutdown({
        tokens: [],
        moduleRef,
        shutdownConfig: config,
      });

      expect(logSpy).not.toHaveBeenCalled();
    });

    it('logs shutdown start with connection count', async () => {
      const logSpy = vi.spyOn(logger, 'logShutdownStart');
      const wrapper = createMockWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(wrapper);
      const config = resolveShutdownConfig();

      await executeShutdown({
        tokens: ['token1', 'token2'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(logSpy).toHaveBeenCalledWith(2);
    });

    it('closes all connections successfully', async () => {
      const wrapper1 = createMockWrapper();
      const wrapper2 = createMockWrapper();
      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(wrapper1)
        .mockReturnValueOnce(wrapper2);
      const config = resolveShutdownConfig();

      const summary = await executeShutdown({
        tokens: ['token1', 'token2'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary.totalConnections).toBe(2);
      expect(summary.successCount).toBe(2);
      expect(summary.failureCount).toBe(0);
      expect(wrapper1.close).toHaveBeenCalled();
      expect(wrapper2.close).toHaveBeenCalled();
    });

    it('logs shutdown complete with statistics', async () => {
      const logSpy = vi.spyOn(logger, 'logShutdownComplete');
      const wrapper = createMockWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(wrapper);
      const config = resolveShutdownConfig();

      const summary = await executeShutdown({
        tokens: ['token1'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(logSpy).toHaveBeenCalledWith(
        1, // total
        1, // success
        0, // failure
        summary.durationMs
      );
    });

    it('returns summary with partial failures', async () => {
      const successWrapper = createMockWrapper();
      const failWrapper = createFailingWrapper();
      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(successWrapper)
        .mockReturnValueOnce(failWrapper);
      const config = resolveShutdownConfig();

      const summary = await executeShutdown({
        tokens: ['token1', 'token2'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary.totalConnections).toBe(2);
      expect(summary.successCount).toBe(1);
      expect(summary.failureCount).toBe(1);
    });

    it('measures duration correctly', async () => {
      const wrapper = createMockWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(wrapper);
      const config = resolveShutdownConfig();

      const start = Date.now();
      const summary = await executeShutdown({
        tokens: ['token1'],
        moduleRef,
        shutdownConfig: config,
      });
      const actualDuration = Date.now() - start;

      expect(summary.durationMs).toBeGreaterThanOrEqual(0);
      expect(summary.durationMs).toBeLessThanOrEqual(actualDuration + 10);
    });

    it('handles timeout errors gracefully', async () => {
      const hangingWrapper = createHangingWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(hangingWrapper);
      const config = resolveShutdownConfig({ shutdownTimeout: 100 });

      const summary = await executeShutdown({
        tokens: ['token1'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary.totalConnections).toBe(1);
      expect(summary.successCount).toBe(0);
      expect(summary.failureCount).toBe(1);
    });

    it('logs timeout when shutdown operation times out', async () => {
      const logSpy = vi.spyOn(logger, 'logShutdownTimeout');
      const config = resolveShutdownConfig({ shutdownTimeout: 100 });

      // Mock closeAllConnections to hang indefinitely
      const closeAllSpy = vi
        .spyOn(orchestrator, 'closeAllConnections')
        .mockImplementation(
          () => new Promise(() => {}) // Never resolves
        );

      await executeShutdown({
        tokens: ['token1'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(logSpy).toHaveBeenCalledWith(100);
      closeAllSpy.mockRestore();
    });

    it('returns failure summary on timeout', async () => {
      const hangingWrapper = createHangingWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(hangingWrapper);
      const config = resolveShutdownConfig({ shutdownTimeout: 100 });

      const summary = await executeShutdown({
        tokens: ['token1', 'token2'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary.totalConnections).toBe(2);
      expect(summary.successCount).toBe(0);
      expect(summary.failureCount).toBe(2);
      expect(summary.durationMs).toBeGreaterThanOrEqual(100);
    });

    it('uses configured timeout from shutdownConfig', async () => {
      const timeoutSpy = vi.spyOn(timeout, 'withTimeout');
      const wrapper = createMockWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(wrapper);
      const config = resolveShutdownConfig({ shutdownTimeout: 5000 });

      await executeShutdown({
        tokens: ['token1'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(timeoutSpy).toHaveBeenCalledWith(
        expect.any(Promise),
        expect.objectContaining({
          timeoutMs: 5000,
          operation: 'shutdown',
        })
      );
    });

    it('uses configured retry attempts from shutdownConfig', async () => {
      const closeAllSpy = vi.spyOn(orchestrator, 'closeAllConnections');
      const wrapper = createMockWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(wrapper);
      const config = resolveShutdownConfig();

      await executeShutdown({
        tokens: ['token1'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(closeAllSpy).toHaveBeenCalledWith(
        ['token1'],
        moduleRef,
        config.timeoutMs,
        config.retryAttempts,
        config.forceClose
      );
    });

    it('returns readonly summary structure', async () => {
      const wrapper = createMockWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(wrapper);
      const config = resolveShutdownConfig();

      const summary = await executeShutdown({
        tokens: ['token1'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary).toHaveProperty('totalConnections');
      expect(summary).toHaveProperty('successCount');
      expect(summary).toHaveProperty('failureCount');
      expect(summary).toHaveProperty('durationMs');
    });

    it('handles mix of success and failures correctly', async () => {
      const wrapper1 = createMockWrapper();
      const wrapper2 = createFailingWrapper();
      const wrapper3 = createMockWrapper();
      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(wrapper1)
        .mockReturnValueOnce(wrapper2)
        .mockReturnValueOnce(wrapper3);
      const config = resolveShutdownConfig();

      const summary = await executeShutdown({
        tokens: ['token1', 'token2', 'token3'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary.totalConnections).toBe(3);
      expect(summary.successCount).toBe(2);
      expect(summary.failureCount).toBe(1);
    });

    it('handles all failures correctly', async () => {
      const wrapper1 = createFailingWrapper();
      const wrapper2 = createFailingWrapper();
      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(wrapper1)
        .mockReturnValueOnce(wrapper2);
      const config = resolveShutdownConfig();

      const summary = await executeShutdown({
        tokens: ['token1', 'token2'],
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary.totalConnections).toBe(2);
      expect(summary.successCount).toBe(0);
      expect(summary.failureCount).toBe(2);
    });

    it('processes symbol tokens correctly', async () => {
      const wrapper = createMockWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(wrapper);
      const config = resolveShutdownConfig();

      const symbolToken = Symbol('test-db');
      const summary = await executeShutdown({
        tokens: [symbolToken],
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary.totalConnections).toBe(1);
      expect(summary.successCount).toBe(1);
    });

    it('processes mixed string and symbol tokens', async () => {
      const wrapper1 = createMockWrapper();
      const wrapper2 = createMockWrapper();
      vi.mocked(moduleRef.get)
        .mockReturnValueOnce(wrapper1)
        .mockReturnValueOnce(wrapper2);
      const config = resolveShutdownConfig();

      const summary = await executeShutdown({
        tokens: ['string-token', Symbol('symbol-token')],
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary.totalConnections).toBe(2);
      expect(summary.successCount).toBe(2);
    });

    it('handles large number of connections', async () => {
      const wrappers = Array.from({ length: 50 }, () => createMockWrapper());
      wrappers.forEach((wrapper) => {
        vi.mocked(moduleRef.get).mockReturnValueOnce(wrapper);
      });
      const config = resolveShutdownConfig();

      const tokens = Array.from({ length: 50 }, (_, i) => `token-${i}`);
      const summary = await executeShutdown({
        tokens,
        moduleRef,
        shutdownConfig: config,
      });

      expect(summary.totalConnections).toBe(50);
      expect(summary.successCount).toBe(50);
      expect(summary.failureCount).toBe(0);
    });

    it('does not throw on errors during shutdown', async () => {
      const hangingWrapper = createHangingWrapper();
      vi.mocked(moduleRef.get).mockReturnValue(hangingWrapper);
      const config = resolveShutdownConfig({ shutdownTimeout: 100 });

      await expect(
        executeShutdown({
          tokens: ['token1'],
          moduleRef,
          shutdownConfig: config,
        })
      ).resolves.toBeDefined();
    });
  });
});

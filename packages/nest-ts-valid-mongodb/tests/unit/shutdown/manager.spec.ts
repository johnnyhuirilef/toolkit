import { Logger } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SHUTDOWN_EVENTS } from '../../../src/lib/constants/shutdown';
import { executeShutdown } from '../../../src/lib/core/shutdown/manager';

// Mock Logger
vi.mock('@nestjs/common', () => ({
  Logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Shutdown Manager', () => {
  let moduleReferenceMock: any;
  let wrapperMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    wrapperMock = {
      close: vi.fn().mockResolvedValue(undefined),
      client: {}, // needed for validation
    };

    moduleReferenceMock = {
      get: vi.fn().mockReturnValue(wrapperMock),
    };
  });

  const defaultConfig = {
    timeoutMs: 1000,
    retryAttempts: 2,
    forceClose: false,
  };

  it('should return empty summary if no tokens', async () => {
    const summary = await executeShutdown([], moduleReferenceMock, defaultConfig);
    expect(summary.totalConnections).toBe(0);
    expect(summary.connections).toEqual([]);
    expect(Logger.log).not.toHaveBeenCalled();
  });

  it('should close connections and emit single wide event', async () => {
    const summary = await executeShutdown(['db1', 'db2'], moduleReferenceMock, defaultConfig);

    expect(summary).toMatchObject({
      event: SHUTDOWN_EVENTS.SHUTDOWN,
      totalConnections: 2,
      successCount: 2,
      failureCount: 0,
    });
    expect(summary.connections).toHaveLength(2);
    expect(summary.connections.every((c) => c.outcome === 'closed')).toBe(true);
    expect(wrapperMock.close).toHaveBeenCalledTimes(2);

    // Wide event: single info-level log
    expect(Logger.log).toHaveBeenCalledTimes(1);
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining(SHUTDOWN_EVENTS.SHUTDOWN),
      'TsValidMongoModule',
    );
  });

  it('should emit error-level wide event when connections fail', async () => {
    moduleReferenceMock.get.mockImplementation((token: string) => {
      if (token === 'bad_db') throw new Error('Injection error');
      return wrapperMock;
    });

    const summary = await executeShutdown(
      ['good_db', 'bad_db'],
      moduleReferenceMock,
      defaultConfig,
    );

    expect(summary.successCount).toBe(1);
    expect(summary.failureCount).toBe(1);
    expect(summary.connections.find((c) => c.token === 'bad_db')?.outcome).toBe('failed');

    // Wide event: single error-level log
    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining(SHUTDOWN_EVENTS.SHUTDOWN),
      'TsValidMongoModule',
    );
  });

  it('should retry failed closures before reporting success', async () => {
    wrapperMock.close.mockRejectedValueOnce(new Error('Network error')).mockResolvedValue('ok');

    const summary = await executeShutdown(['db1'], moduleReferenceMock, defaultConfig);

    expect(summary.successCount).toBe(1);
    expect(summary.failureCount).toBe(0);
    expect(wrapperMock.close).toHaveBeenCalledTimes(2);
  });
});

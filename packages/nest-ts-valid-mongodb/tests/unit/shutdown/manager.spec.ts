import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '@nestjs/common';
import { executeShutdown } from '../../../src/lib/core/shutdown/manager';
import { SHUTDOWN_EVENTS } from '../../../src/lib/constants/shutdown';

// Mock Logger
vi.mock('@nestjs/common', () => ({
  Logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Shutdown Manager', () => {
  let moduleRefMock: any;
  let wrapperMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    wrapperMock = {
      close: vi.fn().mockResolvedValue(undefined),
      client: {}, // needed for validation
    };

    moduleRefMock = {
      get: vi.fn().mockReturnValue(wrapperMock),
    };
  });

  const defaultConfig = {
    timeoutMs: 1000,
    retryAttempts: 2,
    forceClose: false,
  };

  it('should return empty summary if no tokens', async () => {
    const summary = await executeShutdown([], moduleRefMock, defaultConfig);
    expect(summary.totalConnections).toBe(0);
    expect(Logger.log).not.toHaveBeenCalled();
  });

  it('should close connections successfully', async () => {
    const summary = await executeShutdown(['db1', 'db2'], moduleRefMock, defaultConfig);
    
    expect(summary.totalConnections).toBe(2);
    expect(summary.successCount).toBe(2);
    expect(summary.failureCount).toBe(0);
    expect(wrapperMock.close).toHaveBeenCalledTimes(2);
    
    // Check logs using events constant values
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining(SHUTDOWN_EVENTS.START), 
      'TsValidMongoModule'
    );
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining(SHUTDOWN_EVENTS.COMPLETE), 
      'TsValidMongoModule'
    );
  });

  it('should handle failures gracefully', async () => {
    // Make one fail
    moduleRefMock.get.mockImplementation((token: string) => {
      if (token === 'bad_db') {
        throw new Error('Injection error');
      }
      return wrapperMock;
    });

    const summary = await executeShutdown(['good_db', 'bad_db'], moduleRefMock, defaultConfig);
    
    expect(summary.successCount).toBe(1);
    expect(summary.failureCount).toBe(1);
    
    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining(SHUTDOWN_EVENTS.CONNECTION_FAILED),
      'TsValidMongoModule'
    );
  });

  it('should retry failed closures', async () => {
    wrapperMock.close
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('ok');

    await executeShutdown(['db1'], moduleRefMock, defaultConfig);
    
    // Should be called twice (1 fail + 1 success)
    expect(wrapperMock.close).toHaveBeenCalledTimes(2);
  });
});

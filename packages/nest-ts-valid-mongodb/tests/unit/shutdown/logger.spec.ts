import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '@nestjs/common';
import {
  logShutdownStart,
  logShutdownComplete,
  logConnectionClosed,
  logConnectionFailed,
  logShutdownTimeout,
} from '../../../src/lib/core/shutdown/logger';
import { SHUTDOWN_EVENTS } from '../../../src/lib/constants/shutdown';

// Mock Logger
vi.mock('@nestjs/common', () => ({
  Logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Shutdown Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logShutdownStart', () => {
    it('logs shutdown start event with connection count', () => {
      logShutdownStart(5);

      expect(Logger.log).toHaveBeenCalledOnce();

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0];
      expect(loggedMessage).toContain(`"event": "${SHUTDOWN_EVENTS.START}"`);
      expect(loggedMessage).toContain('"connectionCount": 5');
    });

    it('includes timestamp in ISO format', () => {
      logShutdownStart(3);

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0];
      expect(loggedMessage).toContain('"timestamp"');
      expect(loggedMessage).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    it('uses correct logger context', () => {
      logShutdownStart(1);

      const context = vi.mocked(Logger.log).mock.calls[0][1];
      expect(context).toBe('TsValidMongoModule');
    });

    it('handles zero connections', () => {
      logShutdownStart(0);

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0];
      expect(loggedMessage).toContain('"connectionCount": 0');
    });
  });

  describe('logShutdownComplete', () => {
    it('logs shutdown complete with all statistics', () => {
      logShutdownComplete(5, 4, 1, 1234);

      expect(Logger.log).toHaveBeenCalledOnce();

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0];
      expect(loggedMessage).toContain(`"event": "${SHUTDOWN_EVENTS.COMPLETE}"`);
      expect(loggedMessage).toContain('"totalConnections": 5');
      expect(loggedMessage).toContain('"successCount": 4');
      expect(loggedMessage).toContain('"failureCount": 1');
      expect(loggedMessage).toContain('"durationMs": 1234');
    });

    it('includes timestamp', () => {
      logShutdownComplete(3, 3, 0, 500);

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0];
      expect(loggedMessage).toContain('"timestamp"');
    });

    it('handles all failures scenario', () => {
      logShutdownComplete(3, 0, 3, 789);

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0];
      expect(loggedMessage).toContain('"successCount": 0');
      expect(loggedMessage).toContain('"failureCount": 3');
    });

    it('handles all success scenario', () => {
      logShutdownComplete(5, 5, 0, 999);

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0];
      expect(loggedMessage).toContain('"successCount": 5');
      expect(loggedMessage).toContain('"failureCount": 0');
    });
  });

  describe('logConnectionClosed', () => {
    it('logs successful connection close', () => {
      logConnectionClosed('primary-db', 234);

      expect(Logger.log).toHaveBeenCalledOnce();

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0];
      expect(loggedMessage).toContain(`"event": "${SHUTDOWN_EVENTS.CONNECTION_CLOSED}"`);
      expect(loggedMessage).toContain('"token": "primary-db"');
      expect(loggedMessage).toContain('"durationMs": 234');
    });

    it('handles symbol tokens by converting to string', () => {
      const symbolToken = Symbol('test').toString();
      logConnectionClosed(symbolToken, 100);

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0];
      expect(loggedMessage).toContain('"token"');
    });

    it('includes timestamp', () => {
      logConnectionClosed('test', 50);

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0];
      expect(loggedMessage).toContain('"timestamp"');
    });
  });

  describe('logConnectionFailed', () => {
    it('logs connection failure with error details', () => {
      logConnectionFailed({
        token: 'test-db',
        error: 'Network error',
        stack: 'Error stack trace',
      });

      expect(Logger.error).toHaveBeenCalledOnce();

      const loggedMessage = vi.mocked(Logger.error).mock.calls[0][0];
      expect(loggedMessage).toContain(`"event": "${SHUTDOWN_EVENTS.CONNECTION_FAILED}"`);
      expect(loggedMessage).toContain('"token": "test-db"');
      expect(loggedMessage).toContain('"error": "Network error"');
      expect(loggedMessage).toContain('"stack": "Error stack trace"');
    });

    it('handles optional duration', () => {
      logConnectionFailed({
        token: 'test',
        duration: 456,
        error: 'Timeout',
      });

      const loggedMessage = vi.mocked(Logger.error).mock.calls[0][0];
      expect(loggedMessage).toContain('"duration": 456');
    });

    it('handles missing stack trace', () => {
      logConnectionFailed({
        token: 'test',
        error: 'Simple error',
      });

      const loggedMessage = vi.mocked(Logger.error).mock.calls[0][0];
      expect(loggedMessage).toContain('"error": "Simple error"');
      expect(loggedMessage).not.toContain('"stack"');
    });

    it('includes timestamp', () => {
      logConnectionFailed({
        token: 'test',
        error: 'Error',
      });

      const loggedMessage = vi.mocked(Logger.error).mock.calls[0][0];
      expect(loggedMessage).toContain('"timestamp"');
    });
  });

  describe('logShutdownTimeout', () => {
    it('logs shutdown timeout event', () => {
      logShutdownTimeout(10000);

      expect(Logger.error).toHaveBeenCalledOnce();

      const loggedMessage = vi.mocked(Logger.error).mock.calls[0][0];
      expect(loggedMessage).toContain(`"event": "${SHUTDOWN_EVENTS.TIMEOUT}"`);
      expect(loggedMessage).toContain('"timeoutMs": 10000');
    });

    it('includes timestamp', () => {
      logShutdownTimeout(5000);

      const loggedMessage = vi.mocked(Logger.error).mock.calls[0][0];
      expect(loggedMessage).toContain('"timestamp"');
    });

    it('uses error level logging', () => {
      logShutdownTimeout(3000);

      expect(Logger.error).toHaveBeenCalled();
      expect(Logger.log).not.toHaveBeenCalled();
    });
  });

  describe('JSON formatting', () => {
    it('produces valid JSON in all logs', () => {
      logShutdownStart(1);
      logConnectionClosed('test', 100);
      logShutdownComplete(1, 1, 0, 100);

      const messages = [
        ...vi.mocked(Logger.log).mock.calls.map((call) => call[0]),
        ...vi.mocked(Logger.error).mock.calls.map((call) => call[0]),
      ];

      messages.forEach((message) => {
        expect(() => JSON.parse(message as string)).not.toThrow();
      });
    });

    it('formats with pretty print (indentation)', () => {
      logShutdownStart(1);

      const loggedMessage = vi.mocked(Logger.log).mock.calls[0][0] as string;
      expect(loggedMessage).toContain('\n');
      expect(loggedMessage).toContain('  ');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { resolveShutdownConfig } from '../../../src/lib/core/shutdown/config';
import { SHUTDOWN_DEFAULTS } from '../../../src/lib/constants/shutdown';

describe('Shutdown Config Resolver', () => {
  describe('resolveShutdownConfig', () => {
    it('returns defaults when no options provided', () => {
      const config = resolveShutdownConfig();

      expect(config.timeoutMs).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
      expect(config.retryAttempts).toBe(SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS);
      expect(config.forceClose).toBe(SHUTDOWN_DEFAULTS.FORCE_CLOSE);
      expect(config.timeoutMs).toBe(10000);
      expect(config.retryAttempts).toBe(2);
      expect(config.forceClose).toBe(false);
    });

    it('returns defaults when options is undefined', () => {
      const config = resolveShutdownConfig(undefined);

      expect(config.timeoutMs).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
      expect(config.retryAttempts).toBe(SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS);
      expect(config.forceClose).toBe(SHUTDOWN_DEFAULTS.FORCE_CLOSE);
    });

    it('uses user timeout when valid', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: 5000,
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.timeoutMs).toBe(5000);
    });

    it('uses default timeout when invalid negative', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: -1,
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.timeoutMs).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
    });

    it('uses default timeout when NaN', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: NaN,
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.timeoutMs).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
    });

    it('uses default timeout when Infinity', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: Infinity,
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.timeoutMs).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
    });

    it('accepts zero as valid timeout', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: 0,
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.timeoutMs).toBe(0);
    });

    it('accepts large valid timeouts', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: 60000,
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.timeoutMs).toBe(60000);
    });

    it('uses user forceShutdown when true', () => {
      const config = resolveShutdownConfig({
        forceShutdown: true,
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.forceClose).toBe(true);
    });

    it('uses user forceShutdown when false', () => {
      const config = resolveShutdownConfig({
        forceShutdown: false,
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.forceClose).toBe(false);
    });

    it('uses default forceClose when undefined', () => {
      const config = resolveShutdownConfig({
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.forceClose).toBe(SHUTDOWN_DEFAULTS.FORCE_CLOSE);
      expect(config.forceClose).toBe(false);
    });

    it('always uses default retry attempts', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: 5000,
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.retryAttempts).toBe(SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS);
      expect(config.retryAttempts).toBe(2);
    });

    it('returns readonly configuration', () => {
      const config = resolveShutdownConfig();

      // TypeScript should enforce readonly, but we can test object is returned
      expect(config).toHaveProperty('timeoutMs');
      expect(config).toHaveProperty('retryAttempts');
      expect(config).toHaveProperty('forceClose');
    });

    it('handles mixed valid and invalid options', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: -100, // Invalid
        forceShutdown: true, // Valid
        databaseName: 'test',
        uri: 'mongodb://localhost',
      });

      expect(config.timeoutMs).toBe(SHUTDOWN_DEFAULTS.TIMEOUT_MS);
      expect(config.forceClose).toBe(true);
    });

    it('works with mongoClient option variant', () => {
      const config = resolveShutdownConfig({
        shutdownTimeout: 8000,
        forceShutdown: true,
        databaseName: 'test',
        mongoClient: {} as any,
      });

      expect(config.timeoutMs).toBe(8000);
      expect(config.forceClose).toBe(true);
    });
  });
});

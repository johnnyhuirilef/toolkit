import { describe, it, expect } from 'vitest';

import { resolveShutdownConfig } from '../../src/shutdown/config';

describe('resolveShutdownConfig', () => {
  it('returns defaults when options are undefined', () => {
    const config = resolveShutdownConfig(undefined);
    expect(config).toEqual({
      timeoutMs: 10_000,
      retryAttempts: 2,
      forceClose: false,
    });
  });

  it('overrides timeoutMs with valid value', () => {
    const config = resolveShutdownConfig({ uri: 'x', databaseName: 'db', shutdownTimeoutMs: 5000 });
    expect(config.timeoutMs).toBe(5000);
  });

  it('uses default timeoutMs when value is NaN', () => {
    const config = resolveShutdownConfig({
      uri: 'x',
      databaseName: 'db',
      shutdownTimeoutMs: Number.NaN,
    });
    expect(config.timeoutMs).toBe(10_000);
  });

  it('uses default timeoutMs when value is negative', () => {
    const config = resolveShutdownConfig({ uri: 'x', databaseName: 'db', shutdownTimeoutMs: -1 });
    expect(config.timeoutMs).toBe(10_000);
  });

  it('uses default timeoutMs when value is Infinity', () => {
    const config = resolveShutdownConfig({
      uri: 'x',
      databaseName: 'db',
      shutdownTimeoutMs: Infinity,
    });
    expect(config.timeoutMs).toBe(10_000);
  });

  it('overrides retryAttempts', () => {
    const config = resolveShutdownConfig({
      uri: 'x',
      databaseName: 'db',
      shutdownRetryAttempts: 3,
    });
    expect(config.retryAttempts).toBe(3);
  });

  it('overrides forceClose', () => {
    const config = resolveShutdownConfig({ uri: 'x', databaseName: 'db', forceShutdown: true });
    expect(config.forceClose).toBe(true);
  });
});

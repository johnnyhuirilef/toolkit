import { ok, err, isOk, isErr } from '@wenu/mongo';
import { afterEach, describe, it, expect, vi } from 'vitest';

import type { ShutdownConfig } from '../../src/shutdown/config';
import { unknownError } from '../../src/shutdown/errors';
import { closeConnection } from '../../src/shutdown/manager';
import type { MongoClientWrapper } from '../../src/zod-mongo.interfaces';

// manager.ts only ever calls wrapper.close() — `client` is irrelevant to the orchestration
// logic under test, so the fake wrapper is typed against the minimal surface actually consumed.
type FakeWrapper = Pick<MongoClientWrapper, 'close'>;

const buildConfig = (overrides: Partial<ShutdownConfig> = {}): ShutdownConfig => ({
  timeoutMs: 1000,
  retryAttempts: 1,
  forceClose: false,
  ...overrides,
});

const buildWrapper = (close: MongoClientWrapper['close']): FakeWrapper => ({ close });

const setup = (close: MongoClientWrapper['close']) => ({ wrapper: buildWrapper(close) });

const neverResolves = (): Promise<never> => new Promise(() => undefined);

describe('closeConnection', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves ok after a successful close within retry/timeout config', async () => {
    // Arrange
    const { wrapper } = setup(() => Promise.resolve(ok(null)));

    // Act
    const result = await closeConnection(wrapper, buildConfig(), 'close "default"');

    // Assert
    expect(isOk(result)).toBe(true);
  });

  it('retries per config.retryAttempts before giving up', async () => {
    // Arrange
    const close = vi.fn().mockRejectedValue(new Error('connection refused'));
    const { wrapper } = setup(close);

    // Act
    const result = await closeConnection(
      wrapper,
      buildConfig({ retryAttempts: 2 }),
      'close "flaky"',
    );

    // Assert
    expect(isErr(result)).toBe(true);
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('returns Err naming the wrapper close failure when every retry attempt rejects', async () => {
    // Arrange
    const close = vi.fn().mockRejectedValue(new Error('disk full'));
    const { wrapper } = setup(close);

    // Act
    const result = await closeConnection(wrapper, buildConfig({ retryAttempts: 1 }), 'close "bad"');

    // Assert
    expect(result).toMatchObject({ ok: false, error: { message: 'disk full' } });
  });

  it('returns Err when close() exceeds the configured timeout', async () => {
    // Arrange
    vi.useFakeTimers();
    const { wrapper } = setup(neverResolves);

    // Act
    const resultPromise = closeConnection(wrapper, buildConfig({ timeoutMs: 100 }), 'close "slow"');
    await vi.advanceTimersByTimeAsync(200);
    const result = await resultPromise;

    // Assert
    expect(result).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining('exceeded timeout') },
    });
  });

  it('propagates a Result.err returned by wrapper.close() without throwing', async () => {
    // Arrange
    const { wrapper } = setup(() => Promise.resolve(err(unknownError('replica set unreachable'))));

    // Act
    const result = await closeConnection(wrapper, buildConfig(), 'close "replica"');

    // Assert
    expect(result).toMatchObject({
      ok: false,
      error: { message: 'replica set unreachable' },
    });
  });
});

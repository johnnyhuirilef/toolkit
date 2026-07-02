import type { Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { NestContainer } from '@nestjs/core/injector/container';
import { ok, err } from '@wenu/mongo';
import { afterEach, describe, it, expect, vi } from 'vitest';

import type { ShutdownConfig } from '../../src/shutdown/config';
import { unknownError } from '../../src/shutdown/errors';
import { shutdownAll } from '../../src/shutdown/manager';
import type { MongoClientWrapper } from '../../src/zod-mongo.interfaces';

// manager.ts only ever calls wrapper.close() — `client` is irrelevant to the orchestration
// logic under test, so the fake wrapper is typed against the minimal surface actually consumed.
type FakeWrapper = Pick<MongoClientWrapper, 'close'>;

// ponytail: ModuleRef is an abstract class with private/protected members (e.g.
// _instanceLinksHost) — a plain object literal can never structurally satisfy it, so the
// fake extends the real class over a real NestContainer instead of casting.
class FakeModuleReference extends ModuleRef {
  constructor(private readonly wrappers: ReadonlyMap<string, FakeWrapper>) {
    super(new NestContainer());
  }

  // ponytail: TResult must stay generic — ModuleRef's abstract `get` signature requires it,
  // hardcoding a concrete return type breaks the override contract (see probed TS2416).
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
  override get<TResult = unknown>(token: Type | string | symbol): TResult {
    const wrapper = typeof token === 'string' ? this.wrappers.get(token) : undefined;
    return wrapper as TResult;
  }

  override resolve<TResult = unknown>(): Promise<TResult> {
    throw new Error('not implemented');
  }

  override create<T = unknown>(): Promise<T> {
    throw new Error('not implemented');
  }
}

const buildConfig = (overrides: Partial<ShutdownConfig> = {}): ShutdownConfig => ({
  timeoutMs: 1000,
  retryAttempts: 1,
  forceClose: false,
  ...overrides,
});

const buildWrapper = (close: MongoClientWrapper['close']): FakeWrapper => ({ close });

const setup = (wrappers: Record<string, FakeWrapper>) => {
  const reference = new FakeModuleReference(new Map(Object.entries(wrappers)));
  return { reference };
};

const neverResolves = (): Promise<never> => new Promise(() => undefined);

describe('shutdownAll', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports token not found as failed without affecting other entries', async () => {
    // Arrange
    const okWrapper = buildWrapper(() => Promise.resolve(ok(null)));
    const { reference } = setup({ known: okWrapper });

    // Act
    const summary = await shutdownAll(['known', 'missing'], reference, buildConfig());

    // Assert
    expect(summary.total).toBe(2);
    expect(summary.closed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.results[1]).toMatchObject({
      ok: false,
      error: { message: 'No wrapper found for token: missing' },
    });
  });

  it('reports failed after close() rejects on every retry attempt', async () => {
    // Arrange
    const close = vi.fn().mockRejectedValue(new Error('connection refused'));
    const { reference } = setup({ flaky: buildWrapper(close) });

    // Act
    const summary = await shutdownAll(['flaky'], reference, buildConfig({ retryAttempts: 2 }));

    // Assert
    expect(summary.closed).toBe(0);
    expect(summary.failed).toBe(1);
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('reports failed when close() exceeds the configured timeout', async () => {
    // Arrange
    vi.useFakeTimers();
    const { reference } = setup({ slow: buildWrapper(neverResolves) });

    // Act
    const summaryPromise = shutdownAll(['slow'], reference, buildConfig({ timeoutMs: 100 }));
    await vi.advanceTimersByTimeAsync(200);
    const summary = await summaryPromise;

    // Assert
    expect(summary.closed).toBe(0);
    expect(summary.failed).toBe(1);
    expect(summary.results[0]).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining('exceeded timeout') },
    });
  });

  it('counts mixed success and failure correctly', async () => {
    // Arrange
    const succeeding = buildWrapper(() => Promise.resolve(ok(null)));
    const failing = buildWrapper(() => Promise.resolve(err(unknownError('disk full'))));
    const { reference } = setup({ good: succeeding, bad: failing });

    // Act
    const summary = await shutdownAll(['good', 'bad'], reference, buildConfig());

    // Assert
    expect(summary.total).toBe(2);
    expect(summary.closed).toBe(1);
    expect(summary.failed).toBe(1);
  });

  it('reports every connection closed on the happy path', async () => {
    // Arrange
    const wrapperA = buildWrapper(() => Promise.resolve(ok(null)));
    const wrapperB = buildWrapper(() => Promise.resolve(ok(null)));
    const { reference } = setup({ a: wrapperA, b: wrapperB });

    // Act
    const summary = await shutdownAll(['a', 'b'], reference, buildConfig());

    // Assert
    expect(summary.total).toBe(2);
    expect(summary.closed).toBe(2);
    expect(summary.failed).toBe(0);
    expect(summary.results.every((r) => r.ok)).toBe(true);
  });
});

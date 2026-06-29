import type { FactoryProvider } from '@nestjs/common';
import type { ClientSession } from 'mongodb';
import { describe, it, expect, vi } from 'vitest';

import { MongoTransactionModule } from '../../src/transaction/mongo-transaction.module.js';
import { MongoTransactionService } from '../../src/transaction/mongo-transaction.service.js';
import type { MongoClientWrapper } from '../../src/zod-mongo.interfaces';
import { getClientWrapperToken } from '../../src/zod-mongo.tokens';

// ─── Setup ────────────────────────────────────────────────────────────────────

const setup = () => {
  const reference = { sessionObject: null as unknown as ClientSession };
  const withTransaction = vi.fn(async (function_: (s: ClientSession) => Promise<unknown>) => {
    await function_(reference.sessionObject);
    return undefined;
  });
  reference.sessionObject = { withTransaction } as unknown as ClientSession;
  const { sessionObject } = reference;
  const withSession = vi.fn(async (function_: (s: ClientSession) => Promise<void>) => {
    await function_(sessionObject);
  });
  const wrapper = {
    client: { withSession },
    close: vi.fn(),
  } as unknown as MongoClientWrapper;
  const sut = new MongoTransactionService(wrapper);
  return { withTransaction, sessionObject, withSession, wrapper, sut };
};

// ─── MongoTransactionService ──────────────────────────────────────────────────

describe('MongoTransactionService', () => {
  it('S1: callback receives the ClientSession from withTransaction', async () => {
    const { sessionObject, sut } = setup();
    let received: ClientSession | undefined;
    await sut.run(async (s) => {
      received = s;
    });
    expect(received).toBe(sessionObject);
  });

  it('S2: returns ok(value) when callback succeeds', async () => {
    const { sut } = setup();
    const result = await sut.run(async () => 42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it('S3: returns err(DbError) when callback throws', async () => {
    const { sut } = setup();
    const result = await sut.run(async () => {
      throw new Error('boom');
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
    }
  });

  it('S4: resolves to err when withSession rejects — does not throw', async () => {
    const failingWrapper = {
      client: {
        withSession: vi.fn().mockRejectedValue(new Error('driver error')),
      },
      close: vi.fn(),
    } as unknown as MongoClientWrapper;
    const sut = new MongoTransactionService(failingWrapper);
    const result = await sut.run(async () => 'never');
    expect(result.ok).toBe(false);
  });

  it('S5: withSession and withTransaction are each called exactly once', async () => {
    const { withSession, withTransaction, sut } = setup();
    await sut.run(async () => 'done');
    expect(withSession).toHaveBeenCalledTimes(1);
    expect(withTransaction).toHaveBeenCalledTimes(1);
  });
});

// ─── MongoTransactionModule ───────────────────────────────────────────────────

describe('MongoTransactionModule.forFeature', () => {
  it('S6: default connection — provides MongoTransactionService via factory', () => {
    const module = MongoTransactionModule.forFeature();
    const providers = (module.providers ?? []) as FactoryProvider[];
    const provider = providers.find((p) => p.provide === MongoTransactionService);

    expect(provider).toBeDefined();
    expect(provider?.inject).toEqual([getClientWrapperToken(undefined)]);
    expect(module.exports).toContain(MongoTransactionService);

    const fakeWrapper = {
      client: { withSession: vi.fn() },
      close: vi.fn(),
    } as unknown as MongoClientWrapper;
    const instance = provider?.useFactory(fakeWrapper);
    expect(instance).toBeInstanceOf(MongoTransactionService);
  });

  it('S7: named connection — inject uses getClientWrapperToken("secondary")', () => {
    const module = MongoTransactionModule.forFeature({ connectionName: 'secondary' });
    const providers = (module.providers ?? []) as FactoryProvider[];
    const provider = providers.find((p) => p.provide === MongoTransactionService);
    expect(provider?.inject).toEqual([getClientWrapperToken('secondary')]);
  });
});

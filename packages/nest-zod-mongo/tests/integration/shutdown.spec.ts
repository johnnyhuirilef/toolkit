import { MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { shutdownAll } from '../../src/shutdown';
import type { ClientResolver } from '../../src/shutdown';
import type { MongoClientWrapper } from '../../src/zod-mongo.interfaces';
import { establishConnection } from '../../src/zod-mongo.providers';
import { getClientWrapperToken } from '../../src/zod-mongo.tokens';

const buildModuleReference = (wrappers: Record<string, MongoClientWrapper>): ClientResolver => ({
  get: (token: string) => wrappers[token],
});

describe('Graceful shutdown (integration)', () => {
  beforeAll(async () => {
    await startContainer();
  }, 90_000);

  afterAll(async () => {
    await stopContainer();
  });

  it('closes MongoClient gracefully via wrapper.close()', async () => {
    const { wrapper } = await establishConnection({
      uri: getUri(),
      databaseName: 'test_shutdown',
      clientOptions,
    });
    const result = await wrapper.close();
    expect(result.ok).toBe(true);
  });

  it('shutdownAll closes all connections and returns summary', async () => {
    const resultA = await establishConnection({
      uri: getUri(),
      databaseName: 'shutdown_a',
      connectionName: 'a',
      clientOptions,
    });
    const resultB = await establishConnection({
      uri: getUri(),
      databaseName: 'shutdown_b',
      connectionName: 'b',
      clientOptions,
    });

    const tokenA = getClientWrapperToken('a');
    const tokenB = getClientWrapperToken('b');
    const moduleReference = buildModuleReference({
      [tokenA]: resultA.wrapper,
      [tokenB]: resultB.wrapper,
    });

    const summary = await shutdownAll([tokenA, tokenB], moduleReference, {
      timeoutMs: 5000,
      retryAttempts: 1,
      forceClose: false,
    });

    expect(summary.total).toBe(2);
    expect(summary.closed).toBe(2);
    expect(summary.failed).toBe(0);
  });

  it('wrapper.close() resolves ok and client is no longer usable after close', async () => {
    const { wrapper, db: database_ } = await establishConnection({
      uri: getUri(),
      databaseName: 'test_close_check',
      clientOptions,
    });
    const ping = await database_.command({ ping: 1 });
    expect(ping['ok']).toBe(1);

    const closeResult = await wrapper.close();
    expect(closeResult.ok).toBe(true);

    await expect(database_.command({ ping: 1 })).rejects.toThrow();
  });

  it('MongoClientWrapper.client exposes the underlying MongoClient', async () => {
    const { wrapper } = await establishConnection({
      uri: getUri(),
      databaseName: 'test_client_ref',
      clientOptions,
    });
    expect(wrapper.client).toBeInstanceOf(MongoClient);
    await wrapper.close();
  });
});

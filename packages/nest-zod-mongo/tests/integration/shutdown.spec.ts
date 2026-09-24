import { MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { establishConnection } from '../../src/zod-mongo.providers';

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

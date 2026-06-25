import type { Db, MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { establishConnection } from '../../src/zod-mongo.providers';

let database: Db;
let client: MongoClient;

describe('establishConnection via useFactory (forRootAsync integration)', () => {
  beforeAll(async () => {
    await startContainer();
    // Simulate forRootAsync: useFactory resolves options, then establishConnection is called
    const useFactory = vi.fn(() => ({ uri: getUri(), databaseName: 'test_async', clientOptions }));
    const options = useFactory();
    const result = await establishConnection(options);
    database = result.db;
    client = result.wrapper.client;
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await stopContainer();
  });

  it('returns a live Db handle resolved via factory', async () => {
    const result = await database.command({ ping: 1 });
    expect(result['ok']).toBe(1);
  });

  it('factory runs once and its output is passed to establishConnection', async () => {
    const factory = vi.fn(() => ({ uri: getUri(), databaseName: 'test_async_2', clientOptions }));
    const options = factory();
    const { wrapper } = await establishConnection(options);
    const result = await wrapper.client.db('test_async_2').command({ ping: 1 });
    expect(result['ok']).toBe(1);
    expect(factory).toHaveBeenCalledTimes(1);
    await wrapper.client.close();
  });
});

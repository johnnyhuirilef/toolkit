import type { Db, MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import type { MongoAsyncOptions } from '../../src/zod-mongo.interfaces';
import { establishConnection, createAsyncConnectionProviders } from '../../src/zod-mongo.providers';

let database: Db;
let client: MongoClient;

describe('establishConnection via useFactory (forRootAsync integration)', () => {
  beforeAll(async () => {
    await startContainer();
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

describe('createAsyncConnectionProviders with cross-provider inject', () => {
  beforeAll(startContainer, 90_000);
  afterAll(stopContainer);

  it('useFactory receives injected dependencies and resolves options', async () => {
    // Simulate a ConfigService-like provider injected via `inject`
    const CONFIG_SERVICE = 'CONFIG_SERVICE';
    const configService = { get: (key: string) => (key === 'MONGO_URI' ? getUri() : 'test_cross') };

    const asyncOptions: MongoAsyncOptions = {
      inject: [CONFIG_SERVICE],
      useFactory: (config: typeof configService) => ({
        uri: config.get('MONGO_URI'),
        databaseName: config.get('MONGO_DB'),
        clientOptions,
      }),
    };

    const providers = createAsyncConnectionProviders(asyncOptions);
    // The establish provider is always the first one
    const establishProvider = providers[0] as {
      useFactory: (
        ...arguments_: unknown[]
      ) => Promise<{ db: Db; wrapper: { client: MongoClient } }>;
    };

    const { db, wrapper } = await establishProvider.useFactory(configService);
    const result = await db.command({ ping: 1 });
    expect(result['ok']).toBe(1);
    await wrapper.client.close();
  });

  it('useFactory inject array is forwarded to the establish provider', () => {
    const TOKEN_A = 'TOKEN_A';
    const TOKEN_B = Symbol('TOKEN_B');

    const asyncOptions: MongoAsyncOptions = {
      inject: [TOKEN_A, TOKEN_B],
      useFactory: () => ({ uri: 'mongodb://localhost', databaseName: 'x' }),
    };

    const providers = createAsyncConnectionProviders(asyncOptions);
    const establishProvider = providers[0] as { inject: unknown[] };
    expect(establishProvider.inject).toEqual([TOKEN_A, TOKEN_B]);
  });
});

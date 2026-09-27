import { Test } from '@nestjs/testing';
import type { Db } from 'mongodb';
import { MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import type { MongoConnectionOptions } from '../../src/zod-mongo.interfaces';
import { MongoModule } from '../../src/zod-mongo.module';
import { establishConnection, createOptionsProviders } from '../../src/zod-mongo.providers';
import { DEFAULT_CONNECTION_NAME, MONGO_CORE_OPTIONS } from '../../src/zod-mongo.tokens';

let database: Db;
let client: MongoClient;

describe('establishConnection via useFactory (forRootAsync integration)', () => {
  beforeAll(async () => {
    await startContainer();
    const useFactory = vi.fn(
      (): MongoConnectionOptions => ({ uri: getUri(), databaseName: 'test_async', clientOptions }),
    );
    const options = useFactory();
    const result = await establishConnection(DEFAULT_CONNECTION_NAME, options);
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
    const factory = vi.fn(
      (): MongoConnectionOptions => ({
        uri: getUri(),
        databaseName: 'test_async_2',
        clientOptions,
      }),
    );
    const options = factory();
    const { wrapper } = await establishConnection(DEFAULT_CONNECTION_NAME, options);
    const result = await wrapper.client.db('test_async_2').command({ ping: 1 });
    expect(result['ok']).toBe(1);
    expect(factory).toHaveBeenCalledTimes(1);
    await wrapper.client.close();
  });
});

describe('createOptionsProviders with cross-provider inject (forRootAsync integration)', () => {
  beforeAll(startContainer, 90_000);
  afterAll(stopContainer);

  it('useFactory receives injected dependencies and resolves usable options', async () => {
    // Simulate a ConfigService-like provider injected via `inject`.
    const configService = { get: (key: string) => (key === 'MONGO_URI' ? getUri() : 'test_cross') };

    const providers = createOptionsProviders('default', {
      inject: ['CONFIG_SERVICE'],
      useFactory: (config: typeof configService): MongoConnectionOptions => ({
        uri: config.get('MONGO_URI'),
        databaseName: config.get('MONGO_DB'),
        clientOptions,
      }),
    }) as readonly {
      readonly provide: unknown;
      readonly useFactory: (...arguments_: unknown[]) => unknown;
    }[];

    const optionsProvider = providers.find((provider) => provider.provide === MONGO_CORE_OPTIONS);
    if (optionsProvider === undefined) throw new Error('Options provider not found');
    const resolvedOptions = optionsProvider.useFactory(configService) as MongoConnectionOptions;

    const { db, wrapper } = await establishConnection(DEFAULT_CONNECTION_NAME, resolvedOptions);
    const result = await db.command({ ping: 1 });
    expect(result['ok']).toBe(1);
    await wrapper.client.close();
  });

  it('a forRootAsync connection is closed on app.close()', async () => {
    const sharedClient = new MongoClient(getUri(), clientOptions);
    let topologyClosed = false;
    sharedClient.on('topologyClosed', () => {
      topologyClosed = true;
    });

    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRootAsync({
          connectionName: 'async_close',
          useFactory: (): MongoConnectionOptions => ({
            mongoClient: sharedClient,
            databaseName: 'test_async_close',
          }),
        }),
      ],
    }).compile();

    await moduleReference.close();

    expect(topologyClosed).toBe(true);
  }, 30_000);
});

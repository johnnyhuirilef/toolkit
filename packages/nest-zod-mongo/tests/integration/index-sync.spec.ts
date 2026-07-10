import { defineCollection, syncIndexes, index } from '@wenu/mongo';
import type { Db, MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import * as z from 'zod';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { establishConnection, createRepositoryProviders } from '../../src/zod-mongo.providers';

const UserCollection = defineCollection({
  name: 'users_idx',
  schema: z.object({ email: z.string() }),
  idStrategy: 'objectid',
  indexes: [index({ email: 1 }, { unique: true })],
});

let database: Db;
let client: MongoClient;

describe('Index synchronization (integration)', () => {
  beforeAll(async () => {
    await startContainer();
    const result = await establishConnection({
      uri: getUri(),
      databaseName: 'test_idx',
      clientOptions,
    });
    database = result.db;
    client = result.wrapper.client;
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await stopContainer();
  });

  it('syncs indexes when syncIndexes is true (default)', async () => {
    const provider = createRepositoryProviders([UserCollection])[0] as {
      useFactory: (database_: Db, options: unknown) => Promise<unknown>;
    };
    await provider.useFactory(database, { syncIndexes: true });

    const indexes = await database.collection('users_idx').listIndexes().toArray();
    expect(indexes.length).toBeGreaterThan(1);
    const emailIndex = indexes.find((index_) => 'email' in (index_.key ?? {}));
    expect(emailIndex?.unique).toBe(true);
  });

  it('skips syncIndexes call when syncIndexes is false', async () => {
    const syncSpy = vi.spyOn({ syncIndexes }, 'syncIndexes');

    const provider = createRepositoryProviders([UserCollection])[0] as {
      useFactory: (database_: Db, options: unknown) => Promise<unknown>;
    };
    await provider.useFactory(database, { syncIndexes: false });

    expect(syncSpy).not.toHaveBeenCalled();
    syncSpy.mockRestore();
  });
});

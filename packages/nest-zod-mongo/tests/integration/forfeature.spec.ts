import { defineCollection, createRepository } from '@ioni/zod-mongo';
import type { Repository } from '@ioni/zod-mongo';
import type { Db, MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as z from 'zod';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { establishConnection, createRepositoryProviders } from '../../src/zod-mongo.providers';

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ name: z.string() }),
  id: 'objectid',
});

type UserRepo = Repository<typeof UserCollection.schema, 'objectid'>;

let database: Db;
let repo: UserRepo;
let client: MongoClient;

describe('createRepositoryProviders (forFeature integration)', () => {
  beforeAll(async () => {
    await startContainer();
    const result = await establishConnection({
      uri: getUri(),
      databaseName: 'test_forfeature',
      clientOptions,
    });
    database = result.db;
    client = result.wrapper.client;
    const provider = createRepositoryProviders([UserCollection])[0] as {
      useFactory: (database_: Db, options: unknown) => Promise<UserRepo>;
    };
    repo = await provider.useFactory(database, { syncIndexes: true });
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await stopContainer();
  });

  it('repository can insert and findById documents', async () => {
    const createResult = await repo.insert({ name: 'Alice' });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const findResult = await repo.findById(createResult.value._id);
    expect(findResult.ok).toBe(true);
    if (!findResult.ok) return;
    expect(findResult.value?.name).toBe('Alice');
  });

  it('isolates repositories per named connection — tokens differ', async () => {
    const analyticsResult = await establishConnection({
      uri: getUri(),
      databaseName: 'analytics_db',
      connectionName: 'analytics',
      clientOptions,
    });
    const analyticsRepo = createRepository(
      UserCollection,
      analyticsResult.db as unknown as Parameters<typeof createRepository>[1],
    );
    expect(typeof analyticsRepo.insert).toBe('function');
    await analyticsResult.wrapper.client.close();
  });
});

import { Test } from '@nestjs/testing';
import { defineCollection, index } from '@wenu/mongo';
import type { Db, MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as z from 'zod';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { MongoModule } from '../../src/zod-mongo.module';
import { establishConnection, createRepositoryProviders } from '../../src/zod-mongo.providers';
import { DEFAULT_CONNECTION_NAME, getConnectionToken } from '../../src/zod-mongo.tokens';

const UserCollection = defineCollection({
  name: 'users_idx',
  schema: z.object({ email: z.string() }),
  idStrategy: 'objectid',
  indexes: [index({ email: 1 }, { unique: true })],
});

const NoSyncCollection = defineCollection({
  name: 'users_idx_skip',
  schema: z.object({ email: z.string() }),
  idStrategy: 'objectid',
  indexes: [index({ email: 1 }, { unique: true })],
});

let database: Db;
let client: MongoClient;

describe('Index synchronization (integration)', () => {
  beforeAll(async () => {
    await startContainer();
    const result = await establishConnection(DEFAULT_CONNECTION_NAME, {
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
    // Insert first so the namespace exists — syncIndexes:false never creates the collection,
    // and listIndexes on a missing namespace does not reliably report just the default _id index.
    await database.collection('users_idx_skip').insertOne({ email: 'skip@example.com' });
    const provider = createRepositoryProviders([NoSyncCollection])[0] as {
      useFactory: (database_: Db, options: unknown) => Promise<unknown>;
    };

    await provider.useFactory(database, { syncIndexes: false });

    const indexes = await database.collection('users_idx_skip').listIndexes().toArray();
    expect(indexes).toHaveLength(1);
    expect(indexes.every((index_) => index_.name === '_id_')).toBe(true);
  });
});

describe('Index synchronization is isolated per named connection (integration)', () => {
  beforeAll(async () => {
    await startContainer();
  }, 90_000);

  afterAll(async () => {
    await stopContainer();
  });

  it("connection a's repository (syncIndexes:true) applies index synchronization while connection b's repository (syncIndexes:false) on the same collection name does not", async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRoot({
          uri: getUri(),
          databaseName: 'idx_conn_a',
          connectionName: 'a',
          syncIndexes: true,
          clientOptions,
        }),
        MongoModule.forRoot({
          uri: getUri(),
          databaseName: 'idx_conn_b',
          connectionName: 'b',
          syncIndexes: false,
          clientOptions,
        }),
        MongoModule.forFeature([UserCollection], 'a'),
        MongoModule.forFeature([UserCollection], 'b'),
      ],
    }).compile();

    const databaseA = moduleReference.get<Db>(getConnectionToken('a'));
    const databaseB = moduleReference.get<Db>(getConnectionToken('b'));
    // syncIndexes:false on connection b never creates the collection/its indexes — insert a
    // document first so the namespace exists and listIndexes reflects only the default _id index.
    await databaseB.collection('users_idx').insertOne({ email: 'b@example.com' });

    const indexesA = await databaseA.collection('users_idx').listIndexes().toArray();
    const indexesB = await databaseB.collection('users_idx').listIndexes().toArray();

    expect(indexesA.find((index_) => 'email' in (index_.key ?? {}))?.unique).toBe(true);
    expect(indexesB.find((index_) => 'email' in (index_.key ?? {}))).toBeUndefined();

    await moduleReference.close();
  }, 30_000);
});

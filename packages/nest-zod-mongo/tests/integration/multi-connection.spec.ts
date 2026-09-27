import { Test } from '@nestjs/testing';
import { defineCollection } from '@wenu/mongo';
import type { Repository } from '@wenu/mongo';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as z from 'zod';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { MongoModule } from '../../src/zod-mongo.module';
import { getConnectionToken, getRepositoryToken } from '../../src/zod-mongo.tokens';

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ name: z.string() }),
  idStrategy: 'objectid',
});

const setup = () => {
  const clientA = new MongoClient(getUri(), clientOptions);
  const clientB = new MongoClient(getUri(), clientOptions);
  let closedCountA = 0;
  let closedCountB = 0;
  clientA.on('topologyClosed', () => {
    closedCountA += 1;
  });
  clientB.on('topologyClosed', () => {
    closedCountB += 1;
  });

  return {
    clientA,
    clientB,
    getClosedCountA: () => closedCountA,
    getClosedCountB: () => closedCountB,
  };
};

describe('Multi-connection isolation (integration)', () => {
  beforeAll(async () => {
    await startContainer();
  }, 90_000);

  afterAll(async () => {
    await stopContainer();
  });

  it("two named forRoot registrations 'a' and 'b' each close their own client exactly once on app.close()", async () => {
    const { clientA, clientB, getClosedCountA, getClosedCountB } = setup();

    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRoot({
          mongoClient: clientA,
          databaseName: 'multi_conn_a',
          connectionName: 'a',
        }),
        MongoModule.forRoot({
          mongoClient: clientB,
          databaseName: 'multi_conn_b',
          connectionName: 'b',
        }),
      ],
    }).compile();

    await moduleReference.close();

    expect(getClosedCountA()).toBe(1);
    expect(getClosedCountB()).toBe(1);
  }, 30_000);

  it("forFeature repository b inserts into connection b's database, never connection a's", async () => {
    const clientA = new MongoClient(getUri(), clientOptions);
    const clientB = new MongoClient(getUri(), clientOptions);

    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRoot({
          mongoClient: clientA,
          databaseName: 'multi_conn_repo_a',
          connectionName: 'a',
        }),
        MongoModule.forRoot({
          mongoClient: clientB,
          databaseName: 'multi_conn_repo_b',
          connectionName: 'b',
        }),
        MongoModule.forFeature([UserCollection], 'b'),
      ],
    }).compile();

    const repositoryB = moduleReference.get<Repository<typeof UserCollection.schema, 'objectid'>>(
      getRepositoryToken('users', 'b'),
    );
    const inserted = await repositoryB.insert({ name: 'connection-b-only' });
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;
    const insertedId = inserted.value._id;

    const databaseA = moduleReference.get<Db>(getConnectionToken('a'));
    const databaseB = moduleReference.get<Db>(getConnectionToken('b'));
    const foundInA = await databaseA.collection('users').findOne({ _id: insertedId });
    const foundInB = await databaseB.collection('users').findOne({ _id: insertedId });

    expect(foundInA).toBeNull();
    expect(foundInB).not.toBeNull();

    await moduleReference.close();
  }, 30_000);
});

import { Test } from '@nestjs/testing';
import { defineCollection } from '@wenu/mongo';
import type { Repository } from '@wenu/mongo';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { describe, it, expect, vi } from 'vitest';
import * as z from 'zod';

import { MongoConfigurationError } from '../../src/zod-mongo.errors';
import { MongoModule } from '../../src/zod-mongo.module';
import { createRepositoryProviders } from '../../src/zod-mongo.providers';
import { getConnectionToken, getRepositoryToken } from '../../src/zod-mongo.tokens';

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ name: z.string() }),
  idStrategy: 'objectid',
});

const OrderCollection = defineCollection({
  name: 'orders',
  schema: z.object({ total: z.number() }),
  idStrategy: 'objectid',
});

type UserRepo = Repository<typeof UserCollection.schema, 'objectid'>;
type OrderRepo = Repository<typeof OrderCollection.schema, 'objectid'>;

// A real but unconnected MongoClient exercises real Nest DI offline (`client.db()` needs no live
// server), mirroring tests/unit/mongo-core.module.spec.ts — proving the wiring through the actual
// DI container instead of calling a provider's `useFactory` by hand with fabricated arguments.
const makeUnconnectedClient = (): MongoClient => {
  const client = new MongoClient('mongodb://127.0.0.1:1');
  vi.spyOn(client, 'connect').mockResolvedValue(client);
  vi.spyOn(client, 'close').mockResolvedValue(undefined);
  return client;
};

const setup = async () => {
  const moduleReference = await Test.createTestingModule({
    imports: [
      MongoModule.forRoot({
        mongoClient: makeUnconnectedClient(),
        databaseName: 'forfeature_test',
      }),
      MongoModule.forFeature([UserCollection]),
    ],
  }).compile();
  return { moduleReference };
};

const setupNamedConnection = async () => {
  const moduleReference = await Test.createTestingModule({
    imports: [
      MongoModule.forRoot({
        mongoClient: makeUnconnectedClient(),
        databaseName: 'analytics_db',
        connectionName: 'analytics',
      }),
      MongoModule.forFeature([OrderCollection], 'analytics'),
    ],
  }).compile();
  return { moduleReference };
};

const setupTwoConnections = async () => {
  const moduleReference = await Test.createTestingModule({
    imports: [
      MongoModule.forRoot({
        mongoClient: makeUnconnectedClient(),
        databaseName: 'db_a',
        connectionName: 'a',
      }),
      MongoModule.forRoot({
        mongoClient: makeUnconnectedClient(),
        databaseName: 'db_b',
        connectionName: 'b',
      }),
      MongoModule.forFeature([UserCollection], 'a'),
      MongoModule.forFeature([UserCollection], 'b'),
    ],
  }).compile();
  return { moduleReference };
};

describe('MongoModule.forFeature', () => {
  it('creates exactly one provider per collection', () => {
    const providers = createRepositoryProviders([UserCollection, OrderCollection]);

    expect(providers).toHaveLength(2);
  });

  it('resolves an injectable repository for the default connection through real Nest DI', async () => {
    const { moduleReference } = await setup();

    const repository = moduleReference.get<UserRepo>(getRepositoryToken('users'));
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.insert).toBe('function');

    await moduleReference.close();
  });

  it('resolves an injectable repository under the named-connection repository token', async () => {
    const { moduleReference } = await setupNamedConnection();

    const repository = moduleReference.get<OrderRepo>(getRepositoryToken('orders', 'analytics'));
    expect(typeof repository.findById).toBe('function');

    await moduleReference.close();
  });

  it("wires connection b's repository to connection b's Db, not connection a's", async () => {
    const { moduleReference } = await setupTwoConnections();

    const databaseA = moduleReference.get<Db>(getConnectionToken('a'));
    const databaseB = moduleReference.get<Db>(getConnectionToken('b'));
    const repositoryB = moduleReference.get<UserRepo>(getRepositoryToken('users', 'b'));

    expect(databaseA.databaseName).toBe('db_a');
    expect(databaseB.databaseName).toBe('db_b');
    expect(databaseA).not.toBe(databaseB);
    expect(typeof repositoryB.findById).toBe('function');

    await moduleReference.close();
  });

  it('rejects a connection name containing "/"', () => {
    expect(() => MongoModule.forFeature([UserCollection], 'a/b')).toThrow(MongoConfigurationError);
  });
});

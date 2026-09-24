import type { FactoryProvider } from '@nestjs/common';
import { defineCollection } from '@wenu/mongo';
import { describe, it, expect, vi } from 'vitest';
import * as z from 'zod';

import { MongoConfigurationError } from '../../src/zod-mongo.errors';
import type { MongoOptions } from '../../src/zod-mongo.interfaces';
import { MongoModule } from '../../src/zod-mongo.module';
import { createRepositoryProviders } from '../../src/zod-mongo.providers';
import {
  getRepositoryToken,
  getConnectionToken,
  getOptionsToken,
} from '../../src/zod-mongo.tokens';

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

const setup = () => {
  const fakeCollection = {
    findOne: vi.fn(),
    insertOne: vi.fn(),
    createIndexes: vi.fn().mockResolvedValue([]),
    listIndexes: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
  };
  // ponytail: useFactory is (...args: any[]) per FactoryProvider, so structural
  // literals flow in without pretending to be the nominal Db / full MongoOptions
  const fakeDatabase = {
    collection: vi.fn().mockReturnValue(fakeCollection),
  };
  const fakeOptions = {
    databaseName: 'test',
    syncIndexes: false,
  } satisfies Partial<MongoOptions>;
  const providers = createRepositoryProviders([UserCollection]) as FactoryProvider[];
  const repositoryProvider = providers.find((p) => p.provide === getRepositoryToken('users'));

  return { fakeDatabase, fakeOptions, providers, repositoryProvider };
};

const setupTwoConnections = () => {
  const collectionB = vi.fn().mockReturnValue({
    findOne: vi.fn(),
    insertOne: vi.fn(),
    createIndexes: vi.fn().mockResolvedValue([]),
    listIndexes: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
  });
  const fakeDatabaseB = { collection: collectionB };
  const providersB = createRepositoryProviders([UserCollection], 'b') as FactoryProvider[];
  const repositoryProviderB = providersB.find(
    (p) => p.provide === getRepositoryToken('users', 'b'),
  );

  return { fakeDatabaseB, collectionB, repositoryProviderB };
};

describe('MongoModule.forFeature', () => {
  it('forFeature returns providers with correct repository token', () => {
    const dynamicModule = MongoModule.forFeature([UserCollection]);
    const providers = dynamicModule.providers as FactoryProvider[];
    const tokens = providers.map((p) => p.provide);
    expect(tokens).toContain(getRepositoryToken('users'));
  });

  it('assigns the named-connection repository token when a connection name is given', () => {
    const providers = createRepositoryProviders(
      [OrderCollection],
      'analytics',
    ) as FactoryProvider[];
    expect(providers[0]?.provide).toBe(getRepositoryToken('orders', 'analytics'));
  });

  it('creates exactly one provider per collection', () => {
    // Arrange / Act
    const providers = createRepositoryProviders([UserCollection, OrderCollection]);

    // Assert
    expect(providers).toHaveLength(2);
  });

  it('resolves a repository under @InjectRepository(UserCollection)', async () => {
    const { fakeDatabase, fakeOptions, repositoryProvider } = setup();
    expect(repositoryProvider).toBeDefined();

    if (repositoryProvider === undefined) throw new Error('Repository provider not found');
    const repo = await repositoryProvider.useFactory(fakeDatabase, fakeOptions);
    expect(repo).toBeDefined();
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.insert).toBe('function');
  });

  it('inject array includes getConnectionToken and getOptionsToken for the default connection', () => {
    const { repositoryProvider } = setup();
    expect(repositoryProvider?.inject).toEqual([getConnectionToken(), getOptionsToken()]);
  });

  it("forFeature on connection 'b' wires the repository to connection b's Db, not connection a's", async () => {
    const { fakeDatabaseB, collectionB, repositoryProviderB } = setupTwoConnections();
    // The `inject` array is what actually determines which connection's `Db` Nest resolves at
    // runtime (proven end-to-end against a real, separate database in
    // tests/integration/index-sync.spec.ts); this only pins that connection 'b' resolves its own
    // token pair, never connection 'a''s.
    expect(repositoryProviderB?.inject).toEqual([getConnectionToken('b'), getOptionsToken('b')]);
    expect(repositoryProviderB?.inject).not.toEqual([
      getConnectionToken('a'),
      getOptionsToken('a'),
    ]);

    if (repositoryProviderB === undefined) throw new Error('Repository provider not found');
    await repositoryProviderB.useFactory(fakeDatabaseB, {
      databaseName: 'b_db',
      syncIndexes: false,
    });

    expect(collectionB).toHaveBeenCalledWith('users');
  });

  it('rejects a connection name containing "/"', () => {
    expect(() => MongoModule.forFeature([UserCollection], 'a/b')).toThrow(MongoConfigurationError);
  });
});

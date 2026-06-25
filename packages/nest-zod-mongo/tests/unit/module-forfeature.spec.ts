import type { FactoryProvider } from '@nestjs/common';
import { defineCollection } from '@wenu/mongo';
import type { Db } from 'mongodb';
import { describe, it, expect, vi } from 'vitest';
import * as z from 'zod';

import type { MongoOptions } from '../../src/zod-mongo.interfaces';
import { MongoModule } from '../../src/zod-mongo.module';
import { createRepositoryProviders } from '../../src/zod-mongo.providers';
import { getRepositoryToken, ZOD_MONGO_MODULE_OPTIONS } from '../../src/zod-mongo.tokens';

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ name: z.string() }),
  id: 'objectid',
});

describe('MongoModule.forFeature', () => {
  it('forFeature returns providers with correct repository token', () => {
    const dynamicModule = MongoModule.forFeature([UserCollection]);
    const providers = dynamicModule.providers as FactoryProvider[];
    const tokens = providers.map((p) => p.provide);
    expect(tokens).toContain(getRepositoryToken('users'));
  });

  it('resolves a repository under @InjectRepository(UserCollection)', async () => {
    const fakeCollection = {
      findOne: vi.fn(),
      insertOne: vi.fn(),
      createIndexes: vi.fn().mockResolvedValue([]),
      listIndexes: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    };
    const fakeDatabase = {
      collection: vi.fn().mockReturnValue(fakeCollection),
    } as unknown as Db;
    const fakeOptions: MongoOptions = {
      mongoClient: {} as never,
      databaseName: 'test',
      syncIndexes: false,
    };

    const providers = createRepositoryProviders([UserCollection]) as FactoryProvider[];
    const repositoryProvider = providers.find((p) => p.provide === getRepositoryToken('users'));
    expect(repositoryProvider).toBeDefined();

    if (repositoryProvider === undefined) throw new Error('Repository provider not found');
    const repo = await repositoryProvider.useFactory(fakeDatabase, fakeOptions);
    expect(repo).toBeDefined();
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.insert).toBe('function');
  });

  it('inject array includes getConnectionToken and ZOD_MONGO_MODULE_OPTIONS', () => {
    const providers = createRepositoryProviders([UserCollection]) as FactoryProvider[];
    const repositoryProvider = providers.find((p) => p.provide === getRepositoryToken('users'));
    expect(repositoryProvider?.inject).toContain(ZOD_MONGO_MODULE_OPTIONS);
  });
});

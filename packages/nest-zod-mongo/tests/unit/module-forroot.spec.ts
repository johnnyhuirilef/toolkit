import type { FactoryProvider } from '@nestjs/common';
import type { Db, MongoClient } from 'mongodb';
import { describe, it, expect, vi } from 'vitest';

import { ZodMongoConfigurationError } from '../../src/zod-mongo.errors';
import type { ZodMongoOptions } from '../../src/zod-mongo.interfaces';
import { ZodMongoModule } from '../../src/zod-mongo.module';
import { createConnectionProviders, establishConnection } from '../../src/zod-mongo.providers';
import { getConnectionToken, getClientWrapperToken } from '../../src/zod-mongo.tokens';

const makeFakeClient = (overrides?: Partial<MongoClient>): MongoClient => {
  const fakeDatabase = { collection: vi.fn() } as unknown as Db;
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue(fakeDatabase),
    ...overrides,
  } as unknown as MongoClient;
};

describe('ZodMongoModule.forRoot', () => {
  it('throws ZodMongoConfigurationError when neither uri nor mongoClient provided', async () => {
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    const invalidOptions = { databaseName: 'test_db' } as unknown as ZodMongoOptions;
    await expect(establishConnection(invalidOptions)).rejects.toThrow(ZodMongoConfigurationError);
  });

  it('resolves the Db handle under getConnectionToken() when mongoClient provided', async () => {
    const fakeClient = makeFakeClient();
    const options: ZodMongoOptions = { mongoClient: fakeClient, databaseName: 'test_db' };
    const { db } = await establishConnection(options);
    expect(db).toBeDefined();
  });

  it('resolves the MongoClientWrapper under getClientWrapperToken()', async () => {
    const fakeClient = makeFakeClient();
    const options: ZodMongoOptions = { mongoClient: fakeClient, databaseName: 'test_db' };
    const { wrapper } = await establishConnection(options);
    expect(wrapper).toBeDefined();
    expect(typeof wrapper.close).toBe('function');
  });

  it('forRoot returns providers with correct tokens', () => {
    const fakeClient = makeFakeClient();
    const options: ZodMongoOptions = { mongoClient: fakeClient, databaseName: 'test_db' };
    const dynamicModule = ZodMongoModule.forRoot(options);
    const providers = dynamicModule.providers as FactoryProvider[];
    const tokens = providers.map((p) => p.provide);
    expect(tokens).toContain(getConnectionToken());
    expect(tokens).toContain(getClientWrapperToken());
  });

  it('createConnectionProviders registers 5 providers', () => {
    const fakeClient = makeFakeClient();
    const options: ZodMongoOptions = { mongoClient: fakeClient, databaseName: 'test_db' };
    const providers = createConnectionProviders(options);
    expect(providers).toHaveLength(5);
  });
});

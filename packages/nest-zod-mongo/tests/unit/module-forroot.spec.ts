import type { Db, MongoClient } from 'mongodb';
import { describe, it, expect, vi } from 'vitest';

import { MongoCoreModule } from '../../src/mongo-core.module';
import { MongoConfigurationError } from '../../src/zod-mongo.errors';
import type { MongoOptions } from '../../src/zod-mongo.interfaces';
import { MongoModule } from '../../src/zod-mongo.module';
import { establishConnection } from '../../src/zod-mongo.providers';
import { DEFAULT_CONNECTION_NAME } from '../../src/zod-mongo.tokens';

const makeFakeClient = (overrides?: Partial<MongoClient>): MongoClient => {
  const fakeDatabase = { collection: vi.fn() } as unknown as Db;
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    db: vi.fn().mockReturnValue(fakeDatabase),
    ...overrides,
  } as unknown as MongoClient;
};

const setup = () => {
  const fakeClient = makeFakeClient();
  const options: MongoOptions = { mongoClient: fakeClient, databaseName: 'test_db' };
  return { fakeClient, options };
};

describe('MongoModule.forRoot', () => {
  it('throws MongoConfigurationError when neither uri nor mongoClient provided', async () => {
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    const invalidOptions = { databaseName: 'test_db' } as unknown as MongoOptions;
    await expect(establishConnection(DEFAULT_CONNECTION_NAME, invalidOptions)).rejects.toThrow(
      MongoConfigurationError,
    );
  });

  it('resolves the Db handle under getConnectionToken() when mongoClient provided', async () => {
    const { options } = setup();
    const { db } = await establishConnection(DEFAULT_CONNECTION_NAME, options);
    expect(db).toBeDefined();
  });

  it('resolves the MongoClientWrapper under getClientWrapperToken()', async () => {
    const { options } = setup();
    const { wrapper } = await establishConnection(DEFAULT_CONNECTION_NAME, options);
    expect(wrapper).toBeDefined();
    expect(typeof wrapper.close).toBe('function');
  });

  it('forRoot delegates to a MongoCoreModule registration instead of providing tokens itself', () => {
    const { options } = setup();
    const dynamicModule = MongoModule.forRoot(options);
    expect(dynamicModule.providers).toBeUndefined();
    expect(dynamicModule.imports).toHaveLength(1);
    expect(dynamicModule.imports?.[0]).toMatchObject({ module: MongoCoreModule });
  });
});

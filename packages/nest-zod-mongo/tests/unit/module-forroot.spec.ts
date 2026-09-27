import { MongoClient, MongoError } from 'mongodb';
import { describe, it, expect, vi } from 'vitest';

import { MongoCoreModule } from '../../src/mongo-core.module';
import { MongoConfigurationError, MongoConnectionError } from '../../src/zod-mongo.errors';
import type { MongoOptions } from '../../src/zod-mongo.interfaces';
import { MongoModule } from '../../src/zod-mongo.module';
import { establishConnection } from '../../src/zod-mongo.providers';
import { DEFAULT_CONNECTION_NAME } from '../../src/zod-mongo.tokens';

// A real but unconnected MongoClient exercises real Nest DI offline: `client.db()` needs no live
// server, and stubbing `connect`/`close` keeps shutdown deterministic — same pattern as
// mongo-core.module.spec.ts. It is also the only shape `ensureValidOptions` now accepts for
// `mongoClient` (`instanceof MongoClient`, not a structural fake).
const makeUnconnectedClient = (): MongoClient => {
  const client = new MongoClient('mongodb://127.0.0.1:1');
  vi.spyOn(client, 'connect').mockResolvedValue(client);
  vi.spyOn(client, 'close').mockResolvedValue(undefined);
  return client;
};

const setup = () => {
  const mongoClient = makeUnconnectedClient();
  const options: MongoOptions = { mongoClient, databaseName: 'test_db' };
  return { mongoClient, options };
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

// Reflect.apply performs an untyped call, as a plain JS caller would: `mongoClient: null`
// cannot be expressed through the typed options union.
const setupUntypedCaller = () => ({
  establishAsUntypedCaller: (options: object): unknown =>
    Reflect.apply(establishConnection, undefined, ['orders', options]),
});

describe('establishConnection', () => {
  it('builds a client from the uri when mongoClient is null instead of using null as the client', async () => {
    const { establishAsUntypedCaller } = setupUntypedCaller();

    const connecting = establishAsUntypedCaller({
      uri: 'mongodb://127.0.0.1:1',
      clientOptions: { serverSelectionTimeoutMS: 50 },
      mongoClient: null,
      databaseName: 'test_db',
    });

    await expect(connecting).rejects.toThrow(MongoConnectionError);
    // The cause is what tells a driver failure apart from calling connect() on null.
    await expect(connecting).rejects.toMatchObject({ cause: expect.any(MongoError) });
  });
});

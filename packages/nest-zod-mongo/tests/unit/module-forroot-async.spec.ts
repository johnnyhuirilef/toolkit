import type { DynamicModule } from '@nestjs/common';
import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { defineCollection } from '@wenu/mongo';
import { MongoClient } from 'mongodb';
import { describe, it, expect, vi } from 'vitest';
import * as z from 'zod';

import { MongoConfigurationError } from '../../src/zod-mongo.errors';
import type { MongoAsyncOptions, MongoConnectionOptions } from '../../src/zod-mongo.interfaces';
import { MongoModule } from '../../src/zod-mongo.module';
import { createOptionsProviders, establishConnection } from '../../src/zod-mongo.providers';
import {
  getConnectionToken,
  getRepositoryToken,
  MONGO_CORE_OPTIONS,
} from '../../src/zod-mongo.tokens';

// A real but unconnected MongoClient exercises real Nest DI offline: `client.db()` needs no server.
const makeUnconnectedClient = (): MongoClient => {
  const client = new MongoClient('mongodb://127.0.0.1:1');
  vi.spyOn(client, 'connect').mockResolvedValue(client);
  vi.spyOn(client, 'close').mockResolvedValue(undefined);
  return client;
};

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ name: z.string() }),
  idStrategy: 'objectid',
});

const createFakeConnectionOptions = (connectionName: string): MongoConnectionOptions => ({
  mongoClient: makeUnconnectedClient(),
  databaseName: `db_${connectionName}`,
});

const makeUnconnectedFactoryOptions = (): MongoConnectionOptions => ({
  mongoClient: makeUnconnectedClient(),
  databaseName: 'db_reporting',
});

@Injectable()
class FakeOptionsFactory {
  createMongoOptions = vi.fn(createFakeConnectionOptions);
}

@Module({ providers: [FakeOptionsFactory], exports: [FakeOptionsFactory] })
class SharedOptionsModule {}

// Reflect.apply performs an untyped call, which is exactly what a plain JS caller does: the
// discriminated union cannot express these invalid inputs, so no typed call could reach them.
const callAsUntypedCaller = (asyncOptions: object): unknown =>
  Reflect.apply(createOptionsProviders, undefined, ['orders', asyncOptions]);

// A `useFactory` typed to return `MongoConnectionOptions` cannot be written to resolve `{}`; this
// registers with one that does, exactly as a plain JS caller (or an untyped factory) could.
const registerWithUntypedFactoryResult = (createInvalidOptions: () => object): DynamicModule =>
  Reflect.apply(MongoModule.forRootAsync, undefined, [
    { connectionName: 'orders', useFactory: createInvalidOptions },
  ]);

const setup = async (asyncOptions: MongoAsyncOptions) => {
  const moduleReference = await Test.createTestingModule({
    imports: [MongoModule.forRootAsync(asyncOptions)],
  }).compile();
  return { moduleReference };
};

describe('MongoModule.forRootAsync', () => {
  it('useFactory is invoked exactly 1 time when the registration completes', async () => {
    const useFactory = vi.fn(
      (): MongoConnectionOptions => ({ mongoClient: makeUnconnectedClient(), databaseName: 'db' }),
    );

    const { moduleReference } = await setup({ useFactory });

    expect(useFactory).toHaveBeenCalledTimes(1);
    await moduleReference.close();
  });

  it('createMongoOptions is invoked exactly 1 time via useClass when the registration completes', async () => {
    const { moduleReference } = await setup({ useClass: FakeOptionsFactory });
    const factory = moduleReference.get(FakeOptionsFactory);

    expect(factory.createMongoOptions).toHaveBeenCalledTimes(1);
    await moduleReference.close();
  });

  it('an application configured with useClass boots and a forFeature repository for that connection is injectable', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRootAsync({
          connectionName: 'use-class-conn',
          useClass: FakeOptionsFactory,
        }),
        MongoModule.forFeature([UserCollection], 'use-class-conn'),
      ],
    }).compile();

    const database = moduleReference.get(getConnectionToken('use-class-conn'));
    const repository = moduleReference.get(getRepositoryToken('users', 'use-class-conn'));

    expect(database).toBeDefined();
    expect(typeof repository.insert).toBe('function');
    await moduleReference.close();
  });

  it('an application configured with useExisting boots and a forFeature repository for that connection is injectable', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRootAsync({
          connectionName: 'use-existing-conn',
          imports: [SharedOptionsModule],
          useExisting: FakeOptionsFactory,
        }),
        MongoModule.forFeature([UserCollection], 'use-existing-conn'),
      ],
    }).compile();

    const database = moduleReference.get(getConnectionToken('use-existing-conn'));
    const repository = moduleReference.get(getRepositoryToken('users', 'use-existing-conn'));

    expect(database).toBeDefined();
    expect(typeof repository.insert).toBe('function');
    await moduleReference.close();
  });

  it("createMongoOptions is called with the registration's own connectionName ('reporting')", async () => {
    const { moduleReference } = await setup({
      connectionName: 'reporting',
      useClass: FakeOptionsFactory,
    });
    const factory = moduleReference.get(FakeOptionsFactory);

    expect(factory.createMongoOptions).toHaveBeenCalledWith('reporting');
    await moduleReference.close();
  });

  it("a useFactory-returned options object with no connection-name field still registers the connection under the registration's own connectionName", async () => {
    const { moduleReference } = await setup({
      connectionName: 'reporting',
      useFactory: makeUnconnectedFactoryOptions,
    });

    const database = moduleReference.get(getConnectionToken('reporting'));
    expect(database).toBeDefined();
    await moduleReference.close();
  });

  it('establishConnection registers the connection under the name passed as its own argument, never a name read from options', async () => {
    const options: MongoConnectionOptions = {
      mongoClient: makeUnconnectedClient(),
      databaseName: 'db',
    };

    const connection = await establishConnection('reporting', options);

    expect(connection.connectionName).toBe('reporting');
  });

  it('createOptionsProviders forwards asyncOptions.inject to the useFactory provider', () => {
    const TOKEN_A = 'TOKEN_A';
    const TOKEN_B = Symbol('TOKEN_B');

    const providers = createOptionsProviders('default', {
      inject: [TOKEN_A, TOKEN_B],
      useFactory: (): MongoConnectionOptions => ({ uri: 'mongodb://localhost', databaseName: 'x' }),
    }) as readonly { readonly provide: unknown; readonly inject?: readonly unknown[] }[];

    const optionsProvider = providers.find((provider) => provider.provide === MONGO_CORE_OPTIONS);
    expect(optionsProvider?.inject).toEqual([TOKEN_A, TOKEN_B]);
  });

  it('createOptionsProviders throws MongoConfigurationError naming the connection when none of useFactory/useClass/useExisting is provided', () => {
    expect(() => callAsUntypedCaller({})).toThrow(MongoConfigurationError);
    expect(() => callAsUntypedCaller({})).toThrow(/"orders"/);
  });

  it('forRootAsync boot fails with MongoConfigurationError naming the connection when useFactory resolves an invalid shape', async () => {
    const dynamicModule = registerWithUntypedFactoryResult(() => ({}));

    await expect(Test.createTestingModule({ imports: [dynamicModule] }).compile()).rejects.toThrow(
      MongoConfigurationError,
    );
  });

  it('createOptionsProviders throws MongoConfigurationError before selecting a branch when more than one mechanism is provided', () => {
    const asyncOptions = {
      useFactory: vi.fn(
        (): MongoConnectionOptions => ({
          mongoClient: makeUnconnectedClient(),
          databaseName: 'db',
        }),
      ),
      useClass: FakeOptionsFactory,
    };

    expect(() => callAsUntypedCaller(asyncOptions)).toThrow(MongoConfigurationError);
    expect(() => callAsUntypedCaller(asyncOptions)).toThrow(/exactly one/);
  });
});

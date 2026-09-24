import type { FactoryProvider } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { describe, it, expect, vi } from 'vitest';

import { MongoCoreModule } from '../../src/mongo-core.module';
import type { MongoClientWrapper, MongoOptions } from '../../src/zod-mongo.interfaces';
import {
  getConnectionToken,
  getClientWrapperToken,
  MONGO_CORE_OPTIONS,
} from '../../src/zod-mongo.tokens';

// A real but unconnected MongoClient exercises real Nest DI offline: client.db() needs no server,
// and stubbing `close` keeps shutdown deterministic.
const makeUnconnectedClient = (): MongoClient => {
  const client = new MongoClient('mongodb://127.0.0.1:1');
  vi.spyOn(client, 'connect').mockResolvedValue(client);
  vi.spyOn(client, 'close').mockResolvedValue(undefined);
  return client;
};

const setup = async (options: MongoOptions) => {
  const moduleReference = await Test.createTestingModule({
    imports: [MongoCoreModule.forRoot(options)],
  }).compile();
  return { moduleReference };
};

describe('MongoCoreModule.forRoot', () => {
  it('resolves a Db and a MongoClientWrapper for the connection name', async () => {
    // Arrange
    const mongoClient = makeUnconnectedClient();
    const options: MongoOptions = { mongoClient, databaseName: 'core_test' };

    // Act
    const { moduleReference } = await setup(options);
    const database = moduleReference.get<Db>(getConnectionToken());
    const wrapper = moduleReference.get<MongoClientWrapper>(getClientWrapperToken());

    // Assert
    expect(database).toBeDefined();
    expect(typeof wrapper.close).toBe('function');

    await moduleReference.close();
  });

  it('the static options useFactory closure is invoked, never useValue (no mongoClient reference in module metadata)', () => {
    // Arrange
    const mongoClient = makeUnconnectedClient();
    const options: MongoOptions = { mongoClient, databaseName: 'core_test_metadata' };

    // Act
    const dynamicModule = MongoCoreModule.forRoot(options);
    const providers = dynamicModule.providers as FactoryProvider[];
    const optionsProvider = providers.find((provider) => provider.provide === MONGO_CORE_OPTIONS);

    // Assert
    expect(optionsProvider).toBeDefined();
    expect(optionsProvider).toHaveProperty('useFactory');
    expect(optionsProvider).not.toHaveProperty('useValue');
  });
});

describe('MongoCoreModule#onApplicationShutdown', () => {
  it('autoCloseConnection:false skips closeConnection on shutdown (close spy count 0)', async () => {
    // Arrange
    const mongoClient = makeUnconnectedClient();
    const options: MongoOptions = {
      mongoClient,
      databaseName: 'core_test_no_autoclose',
      autoCloseConnection: false,
    };
    const { moduleReference } = await setup(options);

    // Act
    await moduleReference.close();

    // Assert
    expect(mongoClient.close).not.toHaveBeenCalled();
  });

  it('omitting autoCloseConnection closes the client by default on shutdown (close spy count 1)', async () => {
    // Arrange
    const mongoClient = makeUnconnectedClient();
    const options: MongoOptions = { mongoClient, databaseName: 'core_test_default_autoclose' };
    const { moduleReference } = await setup(options);

    // Act
    await moduleReference.close();

    // Assert
    expect(mongoClient.close).toHaveBeenCalledTimes(1);
  });
});

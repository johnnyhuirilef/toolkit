import { Logger } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { ok, err, toDbError, createRepository, syncIndexes } from '@wenu/mongo';
import type { CollectionDef, ZodCompat, IdStrategy } from '@wenu/mongo';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { isNullish, tryit } from 'radashi';

import { MongoConnectionError } from './zod-mongo.errors';
import type {
  MongoConnectionOptions,
  MongoAsyncOptions,
  MongoClientWrapper,
  MongoConnection,
  MongoOptionsFactory,
} from './zod-mongo.interfaces';
import {
  getConnectionToken,
  getOptionsToken,
  getRepositoryToken,
  MONGO_CORE_OPTIONS,
} from './zod-mongo.tokens';
import { ensureSingleOptionsSource, ensureValidOptions } from './zod-mongo.validation';

// --- Connection trio (pure functions, no NestJS, no logging) ---

const resolveClient = (options: MongoConnectionOptions): MongoClient =>
  'mongoClient' in options && !isNullish(options.mongoClient)
    ? options.mongoClient
    : new MongoClient(options.uri, options.clientOptions);

const connectAndWrap = async (
  client: MongoClient,
  options: MongoConnectionOptions,
): Promise<{ readonly db: Db; readonly wrapper: MongoClientWrapper }> => {
  const [error] = await tryit(() => client.connect())();
  if (error !== undefined)
    throw new MongoConnectionError(`Failed to connect to database "${options.databaseName}".`, {
      cause: error,
    });
  const database = client.db(options.databaseName);
  const wrapper: MongoClientWrapper = {
    client,
    close: async (force) => {
      const [closeError] = await tryit(() =>
        client.close(force ?? options.forceShutdown ?? false),
      )();
      return isNullish(closeError) ? ok(null) : err(toDbError(closeError));
    },
  };
  return { db: database, wrapper };
};

// The registration's own connection name is authoritative — it is never read from the resolved
// options object, so a factory/`createMongoOptions` result can never redirect a registration to a
// different connection name than the one it was configured under.
export const establishConnection = (
  connectionName: string,
  options: MongoConnectionOptions,
): Promise<MongoConnection> =>
  Promise.resolve().then(() => {
    const validated = ensureValidOptions(connectionName, options);
    return connectAndWrap(resolveClient(validated), validated).then(({ db, wrapper }) => ({
      connectionName,
      options: validated,
      db,
      wrapper,
    }));
  });

// --- NestJS provider factories ---

export const createOptionsProviders = (
  connectionName: string,
  asyncOptions: MongoAsyncOptions,
): readonly Provider[] => {
  ensureSingleOptionsSource(connectionName, asyncOptions);

  if (asyncOptions.useFactory !== undefined)
    return [
      {
        provide: MONGO_CORE_OPTIONS,
        useFactory: asyncOptions.useFactory,
        inject: asyncOptions.inject ?? [],
      },
    ];

  if (asyncOptions.useClass !== undefined)
    return [
      { provide: asyncOptions.useClass, useClass: asyncOptions.useClass },
      {
        provide: MONGO_CORE_OPTIONS,
        useFactory: (factory: MongoOptionsFactory) => factory.createMongoOptions(connectionName),
        inject: [asyncOptions.useClass],
      },
    ];

  return [
    {
      provide: MONGO_CORE_OPTIONS,
      useFactory: (factory: MongoOptionsFactory) => factory.createMongoOptions(connectionName),
      inject: [asyncOptions.useExisting],
    },
  ];
};

// --- Repository provider factory ---

export const createRepositoryProviders = (
  collections: readonly CollectionDef<ZodCompat, IdStrategy>[],
  connectionName?: string,
): Provider[] =>
  collections.map((collectionEntry) => ({
    provide: getRepositoryToken(collectionEntry.name, connectionName),
    useFactory: async (
      database: Parameters<typeof createRepository>[1],
      moduleOptions: MongoConnectionOptions,
    ) => {
      if (moduleOptions.syncIndexes !== false) {
        const result = await syncIndexes(collectionEntry, database);
        if (!result.ok)
          Logger.warn(
            `Index sync failed for "${collectionEntry.name}": ${result.error.message}`,
            'MongoModule',
          );
      }
      return createRepository(collectionEntry, database);
    },
    inject: [getConnectionToken(connectionName), getOptionsToken(connectionName)],
  }));

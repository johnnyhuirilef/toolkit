import { Logger } from '@nestjs/common';
import type { Provider, InjectionToken } from '@nestjs/common';
import { ok, err, toDbError, createRepository, syncIndexes } from '@wenu/mongo';
import type { CollectionDef, ZodCompat, IdStrategy } from '@wenu/mongo';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { isNullish, tryit } from 'radashi';

import { MongoConnectionError } from './zod-mongo.errors';
import type {
  MongoOptions,
  MongoAsyncOptions,
  MongoClientWrapper,
  MongoConnection,
} from './zod-mongo.interfaces';
import {
  getConnectionToken,
  getClientWrapperToken,
  getOptionsToken,
  getRepositoryToken,
  DEFAULT_CONNECTION_NAME,
} from './zod-mongo.tokens';
import { ensureValidOptions } from './zod-mongo.validation';

// --- Connection trio (pure functions, no NestJS, no logging) ---

const resolveClient = (options: MongoOptions): MongoClient =>
  'mongoClient' in options && options.mongoClient !== undefined
    ? options.mongoClient
    : new MongoClient(options.uri, options.clientOptions);

const connectAndWrap = async (
  client: MongoClient,
  options: MongoOptions,
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

export const establishConnection = (options: MongoOptions): Promise<MongoConnection> =>
  Promise.resolve().then(() => {
    const connectionName = options.connectionName ?? DEFAULT_CONNECTION_NAME;
    const validated = ensureValidOptions(connectionName, options);
    return connectAndWrap(resolveClient(validated), validated).then(({ db, wrapper }) => ({
      connectionName,
      options: validated,
      db,
      wrapper,
    }));
  });

// --- NestJS provider factories ---

export const createAsyncConnectionProviders = (asyncOptions: MongoAsyncOptions): Provider[] => {
  const wrapperToken = getClientWrapperToken(asyncOptions.connectionName);
  const databaseToken = getConnectionToken(asyncOptions.connectionName);
  const establishToken = Symbol(`establish_${asyncOptions.connectionName ?? 'default'}`);
  const inject: InjectionToken[] = asyncOptions.inject ? [...asyncOptions.inject] : [];
  return [
    {
      provide: establishToken,
      useFactory: async (...arguments_: unknown[]) => {
        const options = await asyncOptions.useFactory(...arguments_);
        return establishConnection(options);
      },
      inject,
    },
    {
      provide: wrapperToken,
      useFactory: (established: { readonly db: Db; readonly wrapper: MongoClientWrapper }) =>
        established.wrapper,
      inject: [establishToken],
    },
    {
      provide: databaseToken,
      useFactory: (established: { readonly db: Db; readonly wrapper: MongoClientWrapper }) =>
        established.db,
      inject: [establishToken],
    },
    {
      // Calling useFactory again is acceptable for a pure config factory (ADR mirrors forRoot behavior).
      // The establish provider already called it once above, but forFeature repo factories need
      // this registration's own connection-scoped options token, not a shared one.
      provide: getOptionsToken(asyncOptions.connectionName),
      useFactory: async (...arguments_: unknown[]) => asyncOptions.useFactory(...arguments_),
      inject,
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
      moduleOptions: MongoOptions,
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

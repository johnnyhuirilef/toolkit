import { Logger } from '@nestjs/common';
import type { Provider, InjectionToken } from '@nestjs/common';
import { ok, err, toDbError, createRepository, syncIndexes } from '@wenu/mongo';
import type { CollectionDef, ZodCompat, IdStrategy } from '@wenu/mongo';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { isNullish, tryit } from 'radashi';

import { ZodMongoConfigurationError, ZodMongoConnectionError } from './zod-mongo.errors';
import type {
  ZodMongoOptions,
  ZodMongoAsyncOptions,
  MongoClientWrapper,
} from './zod-mongo.interfaces';
import {
  getConnectionToken,
  getClientWrapperToken,
  getRepositoryToken,
  ZOD_MONGO_CONNECTION_TOKENS,
  ZOD_MONGO_MODULE_OPTIONS,
} from './zod-mongo.tokens';

// --- Connection trio (pure functions, no NestJS, no logging) ---

const ensureValidOptions = (options: ZodMongoOptions): ZodMongoOptions => {
  if (!('uri' in options && options.uri) && !('mongoClient' in options && options.mongoClient))
    throw new ZodMongoConfigurationError('Provide either "uri" or "mongoClient".');
  return options;
};

const resolveClient = (options: ZodMongoOptions): MongoClient =>
  'mongoClient' in options && options.mongoClient !== undefined
    ? options.mongoClient
    : new MongoClient(options.uri, options.clientOptions);

const connectAndWrap = async (
  client: MongoClient,
  options: ZodMongoOptions,
): Promise<{ readonly db: Db; readonly wrapper: MongoClientWrapper }> => {
  const [error] = await tryit(() => client.connect())();
  if (error !== undefined)
    throw new ZodMongoConnectionError(`Failed to connect to database "${options.databaseName}".`, {
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

export const establishConnection = (
  options: ZodMongoOptions,
): Promise<{ readonly db: Db; readonly wrapper: MongoClientWrapper }> =>
  Promise.resolve().then(() => connectAndWrap(resolveClient(ensureValidOptions(options)), options));

// --- NestJS provider factories ---

export const createConnectionProviders = (options: ZodMongoOptions): Provider[] => {
  const wrapperToken = getClientWrapperToken(options.connectionName);
  const databaseToken = getConnectionToken(options.connectionName);
  // Single establish-token guarantees exactly one client.connect() call (ADR-2)
  const establishToken = Symbol(`establish_${String(options.connectionName ?? 'default')}`);
  return [
    {
      provide: establishToken,
      useFactory: () => establishConnection(options),
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
      provide: ZOD_MONGO_MODULE_OPTIONS,
      useValue: options,
    },
    {
      // ponytail: known limitation — multiple forRoot() calls overwrite this token (NestJS v11 types
      // do not expose multi on Provider). Tracked in docs/ia/issues/nest-zod-mongo-multi-connection-shutdown.md
      provide: ZOD_MONGO_CONNECTION_TOKENS,
      useValue: [wrapperToken],
    },
  ];
};

export const createAsyncConnectionProviders = (asyncOptions: ZodMongoAsyncOptions): Provider[] => {
  const wrapperToken = getClientWrapperToken(asyncOptions.connectionName);
  const databaseToken = getConnectionToken(asyncOptions.connectionName);
  const establishToken = Symbol(`establish_${String(asyncOptions.connectionName ?? 'default')}`);
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
      // The establish provider already called it once above, but for options we need a separate provider
      // so ZOD_MONGO_MODULE_OPTIONS is available to forFeature repo factories.
      provide: ZOD_MONGO_MODULE_OPTIONS,
      useFactory: async (...arguments_: unknown[]) => asyncOptions.useFactory(...arguments_),
      inject,
    },
    {
      // ponytail: known limitation — multiple forRootAsync() calls overwrite this token
      // (NestJS v11 types do not expose multi on Provider). Tracked in docs/ia/issues/nest-zod-mongo-multi-connection-shutdown.md
      provide: ZOD_MONGO_CONNECTION_TOKENS,
      useValue: [wrapperToken],
    },
  ];
};

// --- Repository provider factory ---

export const createRepositoryProviders = (
  collections: readonly CollectionDef<ZodCompat, IdStrategy>[],
  connectionName?: string | symbol,
): Provider[] =>
  collections.map((collectionEntry) => ({
    provide: getRepositoryToken(collectionEntry.name, connectionName),
    useFactory: async (database: Db, moduleOptions: ZodMongoOptions) => {
      // ponytail: mongodb@5 Db type differs from @6/@7 at the workspace boundary — cast through unknown
      const databaseHandle = database as unknown as Parameters<typeof createRepository>[1];
      if (moduleOptions.syncIndexes !== false) {
        const result = await syncIndexes(collectionEntry, databaseHandle);
        if (!result.ok)
          Logger.warn(
            `Index sync failed for "${collectionEntry.name}": ${result.error.message}`,
            'ZodMongoModule',
          );
      }
      return createRepository(collectionEntry, databaseHandle);
    },
    inject: [getConnectionToken(connectionName), ZOD_MONGO_MODULE_OPTIONS],
  }));

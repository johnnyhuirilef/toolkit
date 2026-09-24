import { randomUUID } from 'node:crypto';

import type { DynamicModule, OnApplicationShutdown, Provider } from '@nestjs/common';
import { Global, Inject, Logger, Module } from '@nestjs/common';
import { isErr } from '@wenu/mongo';

import { closeConnection, resolveShutdownConfig } from './shutdown';
import type {
  MongoAsyncOptions,
  MongoConnection,
  MongoConnectionOptions,
  MongoOptions,
} from './zod-mongo.interfaces';
import { createOptionsProviders, establishConnection } from './zod-mongo.providers';
import {
  DEFAULT_CONNECTION_NAME,
  getConnectionToken,
  getClientWrapperToken,
  getOptionsToken,
  MONGO_CORE_CONNECTION,
  MONGO_CORE_ID,
  MONGO_CORE_OPTIONS,
} from './zod-mongo.tokens';

@Global()
@Module({})
export class MongoCoreModule implements OnApplicationShutdown {
  constructor(@Inject(MONGO_CORE_CONNECTION) private readonly connection: MongoConnection) {}

  static forRoot(options: MongoOptions): DynamicModule {
    // Nest serializes dynamic module metadata to compute module keys when
    // `moduleIdGeneratorAlgorithm` is "deep-hash" or a snapshot (e.g. Devtools) is enabled — a
    // MongoClient must stay out of that metadata, so options are only reachable through a
    // closure, never through a `useValue` provider.
    const optionsProvider: Provider = { provide: MONGO_CORE_OPTIONS, useFactory: () => options };
    return this.createDynamicModule(options.connectionName, [optionsProvider]);
  }

  static forRootAsync(asyncOptions: MongoAsyncOptions): DynamicModule {
    const connectionName = asyncOptions.connectionName ?? DEFAULT_CONNECTION_NAME;
    return this.createDynamicModule(
      connectionName,
      createOptionsProviders(connectionName, asyncOptions),
      asyncOptions.imports,
    );
  }

  private static createDynamicModule(
    connectionName: string | undefined,
    optionsProviders: readonly Provider[],
    imports: DynamicModule['imports'] = [],
  ): DynamicModule {
    // The registration's own name — never a name read off the resolved options — is what every
    // exported token and the established connection are keyed on.
    const resolvedConnectionName = connectionName ?? DEFAULT_CONNECTION_NAME;
    const connectionProvider: Provider = {
      provide: MONGO_CORE_CONNECTION,
      useFactory: (options: MongoConnectionOptions) =>
        establishConnection(resolvedConnectionName, options),
      inject: [MONGO_CORE_OPTIONS],
    };
    const databaseProvider: Provider = {
      provide: getConnectionToken(resolvedConnectionName),
      useFactory: (connection: MongoConnection) => connection.db,
      inject: [MONGO_CORE_CONNECTION],
    };
    const wrapperProvider: Provider = {
      provide: getClientWrapperToken(resolvedConnectionName),
      useFactory: (connection: MongoConnection) => connection.wrapper,
      inject: [MONGO_CORE_CONNECTION],
    };
    // Exported so forFeature's repository providers can resolve their own connection's
    // syncIndexes option; a single shared token would let the last registration win.
    const optionsProvider: Provider = {
      provide: getOptionsToken(resolvedConnectionName),
      useFactory: (connection: MongoConnection) => connection.options,
      inject: [MONGO_CORE_CONNECTION],
    };

    return {
      module: MongoCoreModule,
      imports,
      providers: [
        ...optionsProviders,
        connectionProvider,
        databaseProvider,
        wrapperProvider,
        optionsProvider,
        // Keeps the keys of separate registrations apart when Nest derives module keys from
        // their metadata ("deep-hash").
        { provide: MONGO_CORE_ID, useValue: randomUUID() },
      ],
      exports: [databaseProvider, wrapperProvider, optionsProvider],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    const { connectionName, options, wrapper } = this.connection;
    const start = Date.now();
    const result = await closeConnection(
      wrapper,
      resolveShutdownConfig(options),
      `close "${connectionName}"`,
    );
    if (isErr(result)) {
      Logger.error(
        `MongoDB connection "${connectionName}" failed to close: ${result.error.message}`,
        'MongoModule',
      );
      return;
    }
    Logger.log(
      `MongoDB connection "${connectionName}" closed in ${String(Date.now() - start)}ms`,
      'MongoModule',
    );
  }
}

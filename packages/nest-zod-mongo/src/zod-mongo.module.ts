import type { DynamicModule, OnApplicationShutdown } from '@nestjs/common';
import { Global, Logger, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { CollectionDef, ZodCompat, IdStrategy } from '@wenu/mongo';
import { isEmpty, tryit } from 'radashi';

import { resolveShutdownConfig, shutdownAll } from './shutdown';
import type { MongoOptions, MongoAsyncOptions } from './zod-mongo.interfaces';
import {
  createConnectionProviders,
  createAsyncConnectionProviders,
  createRepositoryProviders,
} from './zod-mongo.providers';
import { ZOD_MONGO_CONNECTION_TOKENS, ZOD_MONGO_MODULE_OPTIONS } from './zod-mongo.tokens';

@Global()
@Module({})
export class MongoModule implements OnApplicationShutdown {
  constructor(private readonly moduleReference: ModuleRef) {}

  static forRoot(options: MongoOptions): DynamicModule {
    const providers = createConnectionProviders(options);
    return {
      module: MongoModule,
      providers,
      exports: providers,
    };
  }

  static forRootAsync(asyncOptions: MongoAsyncOptions): DynamicModule {
    const providers = createAsyncConnectionProviders(asyncOptions);
    return {
      module: MongoModule,
      imports: asyncOptions.imports ?? [],
      providers,
      exports: providers,
    };
  }

  static forFeature(
    collections: readonly CollectionDef<ZodCompat, IdStrategy>[],
    connectionName?: string | symbol,
  ): DynamicModule {
    const providers = createRepositoryProviders(collections, connectionName);
    return {
      module: MongoModule,
      providers,
      exports: providers,
    };
  }

  async onApplicationShutdown(): Promise<void> {
    // ponytail: resolved at shutdown to avoid @Inject deadlock with async provider chain
    const resolve = <T>(token: string | symbol) =>
      tryit(() => Promise.resolve(this.moduleReference.get<T>(token, { strict: false })))();

    const [tokenError, wrapperTokens] = await resolve<readonly string[]>(
      ZOD_MONGO_CONNECTION_TOKENS,
    );
    if (tokenError !== undefined || isEmpty(wrapperTokens)) return;

    const [optionsError, options] = await resolve<MongoOptions>(ZOD_MONGO_MODULE_OPTIONS);
    const config = resolveShutdownConfig(optionsError === undefined ? options : undefined);
    // ponytail: ModuleRef structurally satisfies ClientResolver with zero cast — its `get`
    // resolves to the overload whose uninstantiated TResult collapses to `any`, which is
    // assignable regardless of variance. ClientResolver keeps method syntax anyway so the
    // assignment survives a future ModuleRef with better-typed generics.
    const summary = await shutdownAll(wrapperTokens, this.moduleReference, config);
    Logger.log(
      `MongoDB shutdown: ${String(summary.closed)}/${String(summary.total)} closed in ${String(summary.durationMs)}ms`,
      'MongoModule',
    );
    if (summary.failed > 0)
      Logger.error(`${String(summary.failed)} connection(s) failed to close`, 'MongoModule');
  }
}

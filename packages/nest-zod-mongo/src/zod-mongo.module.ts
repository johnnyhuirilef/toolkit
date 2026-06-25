import type { CollectionDef, ZodCompat, IdStrategy } from '@ioni/zod-mongo';
import type { DynamicModule, OnApplicationShutdown } from '@nestjs/common';
import { Global, Logger, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { isEmpty, tryit } from 'radashi';

import { resolveShutdownConfig, shutdownAll } from './shutdown';
import type { ZodMongoOptions, ZodMongoAsyncOptions } from './zod-mongo.interfaces';
import {
  createConnectionProviders,
  createAsyncConnectionProviders,
  createRepositoryProviders,
} from './zod-mongo.providers';
import { ZOD_MONGO_CONNECTION_TOKENS, ZOD_MONGO_MODULE_OPTIONS } from './zod-mongo.tokens';

@Global()
@Module({})
export class ZodMongoModule implements OnApplicationShutdown {
  constructor(private readonly moduleReference: ModuleRef) {}

  static forRoot(options: ZodMongoOptions): DynamicModule {
    const providers = createConnectionProviders(options);
    return {
      module: ZodMongoModule,
      providers,
      exports: providers,
    };
  }

  static forRootAsync(asyncOptions: ZodMongoAsyncOptions): DynamicModule {
    const providers = createAsyncConnectionProviders(asyncOptions);
    return {
      module: ZodMongoModule,
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
      module: ZodMongoModule,
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

    const [optionsError, options] = await resolve<ZodMongoOptions>(ZOD_MONGO_MODULE_OPTIONS);
    const config = resolveShutdownConfig(optionsError === undefined ? options : undefined);
    const summary = await shutdownAll(wrapperTokens, this.moduleReference, config);
    Logger.log(
      `MongoDB shutdown: ${String(summary.closed)}/${String(summary.total)} closed in ${String(summary.durationMs)}ms`,
      'ZodMongoModule',
    );
    if (summary.failed > 0)
      Logger.error(`${String(summary.failed)} connection(s) failed to close`, 'ZodMongoModule');
  }
}

import type { DynamicModule, OnApplicationShutdown } from '@nestjs/common';
import { Global, Logger, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { CollectionDef, ZodCompat, IdStrategy } from '@wenu/mongo';
import { err, isOk, isErr } from '@wenu/mongo';
import { isEmpty, isNullish, tryit } from 'radashi';

import { resolveShutdownConfig, closeConnection } from './shutdown';
import { unknownError } from './shutdown/errors';
import type { MongoOptions, MongoAsyncOptions, MongoClientWrapper } from './zod-mongo.interfaces';
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
    connectionName?: string,
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

    const start = Date.now();
    // ponytail: closeConnection (Decision 6) takes an already-resolved wrapper, so this token
    // array still resolves each wrapper via ModuleRef before closing it — the single-wrapper
    // shape T04 keeps working; per-core direct injection replaces this resolution in T05/T06.
    const results = await Promise.all(
      wrapperTokens.map(async (token) => {
        const [wrapperError, wrapper] = await resolve<Pick<MongoClientWrapper, 'close'>>(token);
        if (wrapperError !== undefined || isNullish(wrapper))
          return err(unknownError(`No wrapper found for token: ${token}`));
        return closeConnection(wrapper, config, token);
      }),
    );
    const closed = results.filter((result) => isOk(result)).length;
    const failed = results.filter((result) => isErr(result)).length;
    Logger.log(
      `MongoDB shutdown: ${String(closed)}/${String(results.length)} closed in ${String(Date.now() - start)}ms`,
      'MongoModule',
    );
    if (failed > 0) Logger.error(`${String(failed)} connection(s) failed to close`, 'MongoModule');
  }
}

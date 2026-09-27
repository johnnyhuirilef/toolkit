import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { CollectionDef, ZodCompat, IdStrategy } from '@wenu/mongo';

import { MongoCoreModule } from './mongo-core.module';
import type { MongoOptions, MongoAsyncOptions } from './zod-mongo.interfaces';
import { createRepositoryProviders } from './zod-mongo.providers';

@Module({})
export class MongoModule {
  static forRoot(options: MongoOptions): DynamicModule {
    return {
      module: MongoModule,
      imports: [MongoCoreModule.forRoot(options)],
    };
  }

  static forRootAsync(asyncOptions: MongoAsyncOptions): DynamicModule {
    return {
      module: MongoModule,
      imports: [MongoCoreModule.forRootAsync(asyncOptions)],
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
}

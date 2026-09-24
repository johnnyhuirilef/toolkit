import type { Type } from '@nestjs/common';
import { Injectable, Module } from '@nestjs/common';
import type { MongoClientOptions } from 'mongodb';

import { ItemCollection, ItemService } from './item.fixture';
import type {
  MongoConnectionOptions,
  MongoOptionsFactory,
} from '../../../src/zod-mongo.interfaces';
import { MongoModule } from '../../../src/zod-mongo.module';

/** Configuration style: `forRootAsync({ imports, useExisting })` (default connection). */
export const createExistingOptionsAppModule = (
  uri: string,
  databaseName: string,
  clientOptions?: MongoClientOptions,
): Type => {
  @Injectable()
  class ExistingOptionsFactory implements MongoOptionsFactory {
    createMongoOptions(): MongoConnectionOptions {
      return { uri, databaseName, clientOptions };
    }
  }

  @Module({ providers: [ExistingOptionsFactory], exports: [ExistingOptionsFactory] })
  class ExistingOptionsModule {}

  @Module({
    imports: [
      MongoModule.forRootAsync({
        imports: [ExistingOptionsModule],
        useExisting: ExistingOptionsFactory,
      }),
      MongoModule.forFeature([ItemCollection]),
    ],
    providers: [ItemService],
    exports: [ItemService],
  })
  class ExistingOptionsAppModule {}

  return ExistingOptionsAppModule;
};

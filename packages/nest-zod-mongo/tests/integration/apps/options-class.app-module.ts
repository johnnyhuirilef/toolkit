import type { Type } from '@nestjs/common';
import { Injectable, Module } from '@nestjs/common';
import type { MongoClientOptions } from 'mongodb';

import { ItemCollection, ItemService } from './item.fixture';
import type {
  MongoConnectionOptions,
  MongoOptionsFactory,
} from '../../../src/zod-mongo.interfaces';
import { MongoModule } from '../../../src/zod-mongo.module';

/** Configuration style: `forRootAsync({ useClass })` (default connection). */
export const createOptionsClassAppModule = (
  uri: string,
  databaseName: string,
  clientOptions?: MongoClientOptions,
): Type => {
  @Injectable()
  class OptionsClassFactory implements MongoOptionsFactory {
    createMongoOptions(): MongoConnectionOptions {
      return { uri, databaseName, clientOptions };
    }
  }

  @Module({
    imports: [
      MongoModule.forRootAsync({ useClass: OptionsClassFactory }),
      MongoModule.forFeature([ItemCollection]),
    ],
    providers: [ItemService],
    exports: [ItemService],
  })
  class OptionsClassAppModule {}

  return OptionsClassAppModule;
};

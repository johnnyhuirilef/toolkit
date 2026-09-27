import type { Type } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { MongoClientOptions } from 'mongodb';

import { ItemCollection, ItemService } from './item.fixture';
import type { MongoConnectionOptions } from '../../../src/zod-mongo.interfaces';
import { MongoModule } from '../../../src/zod-mongo.module';

/** Configuration style: `forRootAsync({ useFactory })` (default connection). */
export const createFactoryAppModule = (
  uri: string,
  databaseName: string,
  clientOptions?: MongoClientOptions,
): Type => {
  @Module({
    imports: [
      MongoModule.forRootAsync({
        useFactory: (): MongoConnectionOptions => ({ uri, databaseName, clientOptions }),
      }),
      MongoModule.forFeature([ItemCollection]),
    ],
    providers: [ItemService],
    exports: [ItemService],
  })
  class FactoryAppModule {}

  return FactoryAppModule;
};

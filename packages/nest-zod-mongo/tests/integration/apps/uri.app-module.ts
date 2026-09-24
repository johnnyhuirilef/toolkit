import type { Type } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { MongoClientOptions } from 'mongodb';

import { ItemCollection, ItemService } from './item.fixture';
import { MongoModule } from '../../../src/zod-mongo.module';

/** Configuration style: `uri` (default connection). */
export const createUriAppModule = (
  uri: string,
  databaseName: string,
  clientOptions?: MongoClientOptions,
): Type => {
  @Module({
    imports: [
      MongoModule.forRoot({ uri, databaseName, clientOptions }),
      MongoModule.forFeature([ItemCollection]),
    ],
    providers: [ItemService],
    exports: [ItemService],
  })
  class UriAppModule {}

  return UriAppModule;
};

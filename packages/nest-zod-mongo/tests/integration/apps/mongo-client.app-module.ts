import type { Type } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { MongoClient } from 'mongodb';

import { ItemCollection, ItemService } from './item.fixture';
import { MongoModule } from '../../../src/zod-mongo.module';

/** Configuration style: caller-owned `mongoClient` (default connection). */
export const createMongoClientAppModule = (
  mongoClient: MongoClient,
  databaseName: string,
): Type => {
  @Module({
    imports: [
      MongoModule.forRoot({ mongoClient, databaseName }),
      MongoModule.forFeature([ItemCollection]),
    ],
    providers: [ItemService],
    exports: [ItemService],
  })
  class MongoClientAppModule {}

  return MongoClientAppModule;
};

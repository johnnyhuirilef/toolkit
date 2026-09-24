import type { Type } from '@nestjs/common';
import { Injectable, Module } from '@nestjs/common';
import type { MongoClientOptions } from 'mongodb';

import { ItemCollection } from './item.fixture';
import type { ItemRepository } from './item.fixture';
import { InjectRepository } from '../../../src/zod-mongo.decorators';
import { MongoModule } from '../../../src/zod-mongo.module';

type ConnectionConfig = {
  readonly uri: string;
  readonly databaseName: string;
  readonly clientOptions?: MongoClientOptions;
};

// Fixed to connection "a"/"b" (never a closure parameter) so both services are plain, reusable
// exports rather than one-off classes minted per app-module instantiation.
@Injectable()
export class ItemServiceA {
  constructor(@InjectRepository(ItemCollection, 'a') private readonly repository: ItemRepository) {}

  insert(label: string) {
    return this.repository.insert({ label });
  }

  findById(id: Parameters<ItemRepository['findById']>[0]) {
    return this.repository.findById(id);
  }
}

@Injectable()
export class ItemServiceB {
  constructor(@InjectRepository(ItemCollection, 'b') private readonly repository: ItemRepository) {}

  insert(label: string) {
    return this.repository.insert({ label });
  }

  findById(id: Parameters<ItemRepository['findById']>[0]) {
    return this.repository.findById(id);
  }
}

/** Configuration style: two independent named connections registered in one application. */
export const createMultiConnectionAppModule = (
  connectionA: ConnectionConfig,
  connectionB: ConnectionConfig,
): Type => {
  @Module({
    imports: [
      MongoModule.forRoot({ ...connectionA, connectionName: 'a' }),
      MongoModule.forRoot({ ...connectionB, connectionName: 'b' }),
      MongoModule.forFeature([ItemCollection], 'a'),
      MongoModule.forFeature([ItemCollection], 'b'),
    ],
    providers: [ItemServiceA, ItemServiceB],
    exports: [ItemServiceA, ItemServiceB],
  })
  class MultiConnectionAppModule {}

  return MultiConnectionAppModule;
};

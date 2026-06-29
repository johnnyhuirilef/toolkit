import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';

import type { MongoClientWrapper } from '../zod-mongo.interfaces.js';
import { getClientWrapperToken } from '../zod-mongo.tokens.js';
import { MongoTransactionService } from './mongo-transaction.service.js';

@Module({})
export class MongoTransactionModule {
  static forFeature(options?: { connectionName?: string | symbol }): DynamicModule {
    const wrapperToken = getClientWrapperToken(options?.connectionName);
    return {
      module: MongoTransactionModule,
      providers: [
        {
          provide: MongoTransactionService,
          useFactory: (wrapper: MongoClientWrapper) => new MongoTransactionService(wrapper),
          inject: [wrapperToken],
        },
      ],
      exports: [MongoTransactionService],
    };
  }
}

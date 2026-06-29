import { Injectable } from '@nestjs/common';
import { err, ok, toDbError } from '@wenu/mongo';
import type { Result } from '@wenu/mongo';
import type { ClientSession } from 'mongodb';
import { isNullish, tryit } from 'radashi';

import type { MongoClientWrapper } from '../zod-mongo.interfaces.js';

@Injectable()
export class MongoTransactionService {
  constructor(private readonly wrapper: MongoClientWrapper) {}

  async run<T>(function_: (session: ClientSession) => Promise<T>): Promise<Result<T>> {
    const [error, value] = await tryit(async () => {
      let captured!: T;
      await this.wrapper.client.withSession(async (session) => {
        await session.withTransaction(async (txSession) => {
          captured = await function_(txSession);
        });
      });
      return captured;
    })();

    return isNullish(error) ? ok(value as T) : err(toDbError(error));
  }
}

import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { defineCollection } from '@wenu/mongo';
import type { Repository } from '@wenu/mongo';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as z from 'zod';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { InjectRepository } from '../../src/zod-mongo.decorators';
import { ZodMongoModule } from '../../src/zod-mongo.module';

const UserCollection = defineCollection({
  name: 'users_di',
  schema: z.object({ name: z.string() }),
  id: 'objectid',
});

type UserRepo = Repository<typeof UserCollection.schema, 'objectid'>;

@Injectable()
class UserService {
  constructor(@InjectRepository(UserCollection) readonly repo: UserRepo) {}
}

describe('NestJS DI wiring — @InjectRepository via TestingModule', () => {
  beforeAll(async () => {
    await startContainer();
  }, 90_000);

  afterAll(async () => {
    await stopContainer();
  });

  it('resolves @InjectRepository in a real service via NestJS DI', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [
        ZodMongoModule.forRoot({ uri: getUri(), databaseName: 'test_di', clientOptions }),
        ZodMongoModule.forFeature([UserCollection]),
      ],
      providers: [UserService],
    }).compile();

    const service = moduleReference.get(UserService);
    const result = await service.repo.insert({ name: 'Alice' });
    expect(result.ok).toBe(true);

    await moduleReference.close();
  }, 30_000);
});

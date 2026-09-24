import { Test } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { MongoModule } from '../../src/zod-mongo.module';

describe('Multi-connection isolation (integration)', () => {
  beforeAll(async () => {
    await startContainer();
  }, 90_000);

  afterAll(async () => {
    await stopContainer();
  });

  it("two named forRoot registrations 'a' and 'b' both report their client closed on app.close(), with an observed close count of 2", async () => {
    const clientA = new MongoClient(getUri(), clientOptions);
    const clientB = new MongoClient(getUri(), clientOptions);
    let closedCount = 0;
    clientA.on('topologyClosed', () => {
      closedCount += 1;
    });
    clientB.on('topologyClosed', () => {
      closedCount += 1;
    });

    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRoot({
          mongoClient: clientA,
          databaseName: 'multi_conn_a',
          connectionName: 'a',
        }),
        MongoModule.forRoot({
          mongoClient: clientB,
          databaseName: 'multi_conn_b',
          connectionName: 'b',
        }),
      ],
    }).compile();

    await moduleReference.close();

    expect(closedCount).toBe(2);
  }, 30_000);
});

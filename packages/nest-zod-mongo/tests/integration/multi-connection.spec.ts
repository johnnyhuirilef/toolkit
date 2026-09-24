import { Test } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { MongoModule } from '../../src/zod-mongo.module';

const setup = () => {
  const clientA = new MongoClient(getUri(), clientOptions);
  const clientB = new MongoClient(getUri(), clientOptions);
  let closedCountA = 0;
  let closedCountB = 0;
  clientA.on('topologyClosed', () => {
    closedCountA += 1;
  });
  clientB.on('topologyClosed', () => {
    closedCountB += 1;
  });

  return {
    clientA,
    clientB,
    getClosedCountA: () => closedCountA,
    getClosedCountB: () => closedCountB,
  };
};

describe('Multi-connection isolation (integration)', () => {
  beforeAll(async () => {
    await startContainer();
  }, 90_000);

  afterAll(async () => {
    await stopContainer();
  });

  it("two named forRoot registrations 'a' and 'b' each close their own client exactly once on app.close()", async () => {
    const { clientA, clientB, getClosedCountA, getClosedCountB } = setup();

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

    expect(getClosedCountA()).toBe(1);
    expect(getClosedCountB()).toBe(1);
  }, 30_000);
});

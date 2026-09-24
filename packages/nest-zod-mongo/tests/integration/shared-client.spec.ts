import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { MongoModule } from '../../src/zod-mongo.module';

describe('Shared-client idempotent close (integration)', () => {
  beforeAll(async () => {
    await startContainer();
  }, 90_000);

  afterAll(async () => {
    await stopContainer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a MongoClient shared by registrations a and b emits topologyClosed exactly once across both shutdowns', async () => {
    const sharedClient = new MongoClient(getUri(), clientOptions);
    let topologyClosedCount = 0;
    sharedClient.on('topologyClosed', () => {
      topologyClosedCount += 1;
    });
    const errorSpy = vi.spyOn(Logger, 'error').mockImplementation(vi.fn());

    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRoot({
          mongoClient: sharedClient,
          databaseName: 'shared_client_a',
          connectionName: 'a',
        }),
        MongoModule.forRoot({
          mongoClient: sharedClient,
          databaseName: 'shared_client_b',
          connectionName: 'b',
        }),
      ],
    }).compile();

    await moduleReference.close();

    expect(topologyClosedCount).toBe(1);
    expect(errorSpy).not.toHaveBeenCalled();
  }, 30_000);

  it("shared-client close is exactly-once regardless of which registration's shutdown hook runs first", async () => {
    const sharedClient = new MongoClient(getUri(), clientOptions);
    let topologyClosedCount = 0;
    sharedClient.on('topologyClosed', () => {
      topologyClosedCount += 1;
    });
    const errorSpy = vi.spyOn(Logger, 'error').mockImplementation(vi.fn());

    // Registration order reversed relative to the previous test — b registered before a — to
    // pin that the exactly-once guarantee holds regardless of which shutdown hook Nest runs first.
    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRoot({
          mongoClient: sharedClient,
          databaseName: 'shared_client_b_first',
          connectionName: 'b',
        }),
        MongoModule.forRoot({
          mongoClient: sharedClient,
          databaseName: 'shared_client_a_second',
          connectionName: 'a',
        }),
      ],
    }).compile();

    await moduleReference.close();

    expect(topologyClosedCount).toBe(1);
    expect(errorSpy).not.toHaveBeenCalled();
  }, 30_000);
});

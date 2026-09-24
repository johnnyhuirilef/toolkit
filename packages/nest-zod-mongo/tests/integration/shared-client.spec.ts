import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { MongoModule } from '../../src/zod-mongo.module';

// Reads which connection's "closed in ...ms" message Logger.log recorded first, to pin the
// actual shutdown-hook order instead of only counting how many times it ran.
const readClosedOrder = (logSpy: ReturnType<typeof vi.spyOn>): readonly string[] =>
  logSpy.mock.calls
    .map(([message]) => String(message))
    .filter((message) => message.includes('closed in'))
    .map((message) => (message.includes('"b"') ? 'b' : 'a'));

const setup = () => {
  const sharedClient = new MongoClient(getUri(), clientOptions);
  let topologyClosedCount = 0;
  sharedClient.on('topologyClosed', () => {
    topologyClosedCount += 1;
  });
  const errorSpy = vi.spyOn(Logger, 'error').mockImplementation(vi.fn());
  const logSpy = vi.spyOn(Logger, 'log').mockImplementation(vi.fn());

  return { sharedClient, getTopologyClosedCount: () => topologyClosedCount, errorSpy, logSpy };
};

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
    const { sharedClient, getTopologyClosedCount, errorSpy, logSpy } = setup();

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

    // Nest runs global-module shutdown hooks in the reverse of their registration order — b
    // (registered second) closes before a.
    expect(readClosedOrder(logSpy)).toEqual(['b', 'a']);
    expect(getTopologyClosedCount()).toBe(1);
    expect(errorSpy).not.toHaveBeenCalled();
  }, 30_000);

  it("shared-client close is exactly-once regardless of which registration's shutdown hook runs first", async () => {
    const { sharedClient, getTopologyClosedCount, errorSpy, logSpy } = setup();

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

    // Reversing the registration order reverses the observed shutdown order too (a now closes
    // first) — proving the exactly-once guarantee does not depend on which hook Nest runs first.
    expect(readClosedOrder(logSpy)).toEqual(['a', 'b']);
    expect(getTopologyClosedCount()).toBe(1);
    expect(errorSpy).not.toHaveBeenCalled();
  }, 30_000);
});

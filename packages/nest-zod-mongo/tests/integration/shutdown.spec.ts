import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { MongoModule } from '../../src/zod-mongo.module';
import { establishConnection } from '../../src/zod-mongo.providers';

describe('Graceful shutdown (integration)', () => {
  beforeAll(async () => {
    await startContainer();
  }, 90_000);

  afterAll(async () => {
    await stopContainer();
  });

  it('closes MongoClient gracefully via wrapper.close()', async () => {
    const { wrapper } = await establishConnection({
      uri: getUri(),
      databaseName: 'test_shutdown',
      clientOptions,
    });
    const result = await wrapper.close();
    expect(result.ok).toBe(true);
  });

  it('wrapper.close() resolves ok and client is no longer usable after close', async () => {
    const { wrapper, db: database_ } = await establishConnection({
      uri: getUri(),
      databaseName: 'test_close_check',
      clientOptions,
    });
    const ping = await database_.command({ ping: 1 });
    expect(ping['ok']).toBe(1);

    const closeResult = await wrapper.close();
    expect(closeResult.ok).toBe(true);

    await expect(database_.command({ ping: 1 })).rejects.toThrow();
  });

  it('MongoClientWrapper.client exposes the underlying MongoClient', async () => {
    const { wrapper } = await establishConnection({
      uri: getUri(),
      databaseName: 'test_client_ref',
      clientOptions,
    });
    expect(wrapper.client).toBeInstanceOf(MongoClient);
    await wrapper.close();
  });

  it("connection a's shutdown failure does not block connection b's shutdown; the outcome reports a as failed and b as closed", async () => {
    const clientA = new MongoClient(getUri(), clientOptions);
    await clientA.connect();
    vi.spyOn(clientA, 'close').mockRejectedValue(new Error('boom'));
    const clientB = new MongoClient(getUri(), clientOptions);

    const errorSpy = vi.spyOn(Logger, 'error').mockImplementation(vi.fn());
    const logSpy = vi.spyOn(Logger, 'log').mockImplementation(vi.fn());

    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRoot({
          mongoClient: clientA,
          databaseName: 'test_shutdown_a',
          connectionName: 'a',
          shutdownRetryAttempts: 1,
        }),
        MongoModule.forRoot({
          mongoClient: clientB,
          databaseName: 'test_shutdown_b',
          connectionName: 'b',
        }),
      ],
    }).compile();

    await moduleReference.close();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"a"'), 'MongoModule');
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/"b".*closed/), 'MongoModule');

    errorSpy.mockRestore();
    logSpy.mockRestore();
    await clientB.close();
  }, 30_000);
});

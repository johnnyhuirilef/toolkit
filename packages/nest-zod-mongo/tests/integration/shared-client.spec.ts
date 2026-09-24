import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { MongoCoreModule } from '../../src/mongo-core.module';
import type { MongoClientWrapper, MongoConnectionOptions } from '../../src/zod-mongo.interfaces';
import { MongoModule } from '../../src/zod-mongo.module';
import {
  getConnectionToken,
  getClientWrapperToken,
  getOptionsToken,
} from '../../src/zod-mongo.tokens';

const setup = () => {
  const sharedClient = new MongoClient(getUri(), clientOptions);
  let topologyClosedCount = 0;
  sharedClient.on('topologyClosed', () => {
    topologyClosedCount += 1;
  });
  const errorSpy = vi.spyOn(Logger, 'error').mockImplementation(vi.fn());

  return { sharedClient, getTopologyClosedCount: () => topologyClosedCount, errorSpy };
};

// The DI container already assembled this connection's Db/wrapper/options records; this builds
// a second, undeclared MongoCoreModule instance around them so its shutdown hook can be invoked
// directly, in an order this test chooses, instead of relying on which order Nest itself happens
// to run global-module shutdown hooks in (that order is incidental framework behavior, not a
// contract the production code depends on).
const resolveCore = (moduleReference: TestingModule, connectionName: string): MongoCoreModule => {
  const database = moduleReference.get<Db>(getConnectionToken(connectionName));
  const wrapper = moduleReference.get<MongoClientWrapper>(getClientWrapperToken(connectionName));
  const options = moduleReference.get<MongoConnectionOptions>(getOptionsToken(connectionName));
  return new MongoCoreModule({ connectionName, options, db: database, wrapper });
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

  it('a MongoClient shared by registrations a and b closes its topology exactly once when a shuts down before b', async () => {
    const { sharedClient, getTopologyClosedCount, errorSpy } = setup();
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

    const coreA = resolveCore(moduleReference, 'a');
    const coreB = resolveCore(moduleReference, 'b');

    await coreA.onApplicationShutdown();
    await coreB.onApplicationShutdown();

    expect(getTopologyClosedCount()).toBe(1);
    expect(errorSpy).not.toHaveBeenCalled();

    await moduleReference.close();
  }, 30_000);

  it('a MongoClient shared by registrations a and b closes its topology exactly once when b shuts down before a', async () => {
    const { sharedClient, getTopologyClosedCount, errorSpy } = setup();
    const moduleReference = await Test.createTestingModule({
      imports: [
        MongoModule.forRoot({
          mongoClient: sharedClient,
          databaseName: 'shared_client_a2',
          connectionName: 'a',
        }),
        MongoModule.forRoot({
          mongoClient: sharedClient,
          databaseName: 'shared_client_b2',
          connectionName: 'b',
        }),
      ],
    }).compile();

    const coreA = resolveCore(moduleReference, 'a');
    const coreB = resolveCore(moduleReference, 'b');

    await coreB.onApplicationShutdown();
    await coreA.onApplicationShutdown();

    expect(getTopologyClosedCount()).toBe(1);
    expect(errorSpy).not.toHaveBeenCalled();

    await moduleReference.close();
  }, 30_000);
});

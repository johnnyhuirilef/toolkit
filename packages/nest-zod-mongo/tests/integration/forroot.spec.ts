import type { Db, MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { MongoConnectionError } from '../../src/zod-mongo.errors';
import { establishConnection } from '../../src/zod-mongo.providers';

let database: Db;
let client: MongoClient;

describe('establishConnection (forRoot integration)', () => {
  beforeAll(async () => {
    await startContainer();
    const result = await establishConnection({
      uri: getUri(),
      databaseName: 'test_db',
      clientOptions,
    });
    database = result.db;
    client = result.wrapper.client;
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await stopContainer();
  });

  it('returns a live Db handle that responds to ping', async () => {
    const result = await database.command({ ping: 1 });
    expect(result['ok']).toBe(1);
  });

  it('throws MongoConnectionError on bad URI', async () => {
    await expect(
      establishConnection({
        uri: 'mongodb://localhost:1',
        databaseName: 'test_db',
        clientOptions: { connectTimeoutMS: 1000, serverSelectionTimeoutMS: 1000 },
      }),
    ).rejects.toBeInstanceOf(MongoConnectionError);
  }, 10_000);
});

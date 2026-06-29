import { MongoDBContainer, type StartedMongoDBContainer } from '@testcontainers/mongodb';
import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as z from 'zod';

import { createRepository, defineCollection } from '../../src/index.js';

// ponytail: separate file + container without directConnection so the driver negotiates RS
// membership and accepts withTransaction(). The main integration suite uses directConnection: true
// which bypasses RS negotiation and causes "Transaction numbers are only allowed on a replica set
// member" errors. withTransaction requires a real replica set — standalone Mongo rejects it.
describe('session() — withTransaction (replica set)', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;

  const TxCollection = defineCollection({
    name: 'tx-test',
    schema: z.object({ label: z.string() }),
    id: 'uuid' as const,
  });

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7')
      // ponytail: advertise as localhost so the driver resolves the RS member from outside Docker.
      // Without this, MongoDB announces its container hostname and the driver fails with ENOTFOUND.
      .withCommand([
        'mongod',
        '--replSet',
        'rs0',
        '--bind_ip_all',
        '--setParameter',
        'disableJavaScriptProtection=1',
      ])
      .start();
    const port = String(container.getMappedPort(27_017));
    client = new MongoClient(`mongodb://localhost:${port}/?replicaSet=rs0&directConnection=true`);
    await client.connect();
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  beforeEach(async () => {
    await client.db('test-tx').collection('tx-test').deleteMany({});
  });

  const setup = () => ({ repo: createRepository(TxCollection, client.db('test-tx')) });

  it('withTransaction commits all ops atomically', async () => {
    // Arrange
    const { repo } = setup();
    const session = client.startSession();

    // Act
    await session.withTransaction(async () => {
      await repo.session(session).insert({ label: 'tx-doc-1' });
      await repo.session(session).insert({ label: 'tx-doc-2' });
    });
    await session.endSession();

    // Assert — both docs visible after commit
    const result = await repo.find();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
    const labels = result.value.map((d) => d.label).sort();
    expect(labels).toEqual(['tx-doc-1', 'tx-doc-2']);
  });

  it('withTransaction rolls back all ops on abort', async () => {
    // Arrange
    const { repo } = setup();
    const session = client.startSession();

    // Act — transaction aborts due to thrown error
    await expect(
      session.withTransaction(async () => {
        await repo.session(session).insert({ label: 'will-be-rolled-back' });
        throw new Error('intentional abort');
      }),
    ).rejects.toThrow('intentional abort');

    await session.endSession();

    // Assert — nothing committed
    const result = await repo.find();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
  });

  it('session() on multiple repos in the same transaction is atomic', async () => {
    // Arrange
    const ACollection = defineCollection({
      name: 'tx-a',
      schema: z.object({ val: z.number() }),
      id: 'uuid' as const,
    });
    const BCollection = defineCollection({
      name: 'tx-b',
      schema: z.object({ val: z.number() }),
      id: 'uuid' as const,
    });
    const database = client.db('test-tx-multi');
    const repoA = createRepository(ACollection, database);
    const repoB = createRepository(BCollection, database);
    const session = client.startSession();

    // Act
    await session.withTransaction(async () => {
      await repoA.session(session).insert({ val: 1 });
      await repoB.session(session).insert({ val: 2 });
    });
    await session.endSession();

    // Assert — both collections written atomically
    const [a, b] = await Promise.all([repoA.find(), repoB.find()]);
    expect(a.ok && a.value).toHaveLength(1);
    expect(b.ok && b.value).toHaveLength(1);
  });
});

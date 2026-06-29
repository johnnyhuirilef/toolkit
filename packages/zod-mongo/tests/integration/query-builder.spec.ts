import { MongoDBContainer, type StartedMongoDBContainer } from '@testcontainers/mongodb';
import type { Db } from 'mongodb';
import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as z from 'zod';

import { createRepository, defineCollection } from '../../src/index.js';

const schema = z.object({ name: z.string(), score: z.number() });

const QbCollection = defineCollection({
  name: 'qb-integration',
  schema,
  id: 'uuid' as const,
});

describe('QueryBuilder — integration', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;
  let database: Db;

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), { directConnection: true });
    await client.connect();
    database = client.db('test-qb');
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  beforeEach(async () => {
    await database.collection('qb-integration').deleteMany({});
  });

  const setup = () => ({ repo: createRepository(QbCollection, database) });

  it('.filter({ name }) returns only matching documents', async () => {
    // Arrange
    const { repo } = setup();
    await repo.insertMany([
      { name: 'Alice', score: 10 },
      { name: 'Bob', score: 20 },
    ]);

    // Act
    const result = await repo.query().filter({ name: 'Bob' }).exec();

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]?.name).toBe('Bob');
  });

  it('.sort({ score: -1 }) returns documents in descending order', async () => {
    // Arrange
    const { repo } = setup();
    await repo.insertMany([
      { name: 'Low', score: 1 },
      { name: 'High', score: 3 },
      { name: 'Mid', score: 2 },
    ]);

    // Act
    const result = await repo.query().sort({ score: -1 }).exec();

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const scores = result.value.map((d) => d.score);
    expect(scores).toEqual([3, 2, 1]);
  });

  it('.limit(2) caps the result to 2 documents', async () => {
    // Arrange
    const { repo } = setup();
    await repo.insertMany([
      { name: 'A', score: 1 },
      { name: 'B', score: 2 },
      { name: 'C', score: 3 },
    ]);

    // Act
    const result = await repo.query().limit(2).exec();

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
  });

  it('.skip(1).limit(1) returns the second document by insertion order', async () => {
    // Arrange
    const { repo } = setup();
    await repo.insertMany([
      { name: 'First', score: 1 },
      { name: 'Second', score: 2 },
      { name: 'Third', score: 3 },
    ]);

    // Act
    const result = await repo.query().sort({ score: 1 }).skip(1).limit(1).exec();

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]?.name).toBe('Second');
  });

  it('full chain filters, sorts, skips, and limits correctly', async () => {
    // Arrange
    const { repo } = setup();
    await repo.insertMany([
      { name: 'Alice', score: 5 },
      { name: 'Alice', score: 3 },
      { name: 'Alice', score: 1 },
      { name: 'Bob', score: 4 },
    ]);

    // Act — Alice docs sorted descending, skip first (score 5), take 1 → score 3
    const result = await repo
      .query()
      .filter({ name: 'Alice' })
      .sort({ score: -1 })
      .skip(1)
      .limit(1)
      .exec();

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]?.score).toBe(3);
  });

  it('.filter({ name: "Nobody" }).exec() returns empty array, not an error', async () => {
    // Arrange
    const { repo } = setup();
    await repo.insert({ name: 'Someone', score: 1 });

    // Act
    const result = await repo.query().filter({ name: 'Nobody' }).exec();

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });
});

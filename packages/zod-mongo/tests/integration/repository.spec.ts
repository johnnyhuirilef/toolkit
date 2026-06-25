import { MongoDBContainer, type StartedMongoDBContainer } from '@testcontainers/mongodb';
import type { Db } from 'mongodb';
import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createRepository, defineCollection, index, syncIndexes } from '../../src/index.js';

const schema = z.object({ name: z.string(), email: z.string().email() });

const UserCollection = defineCollection({
  name: 'users',
  schema,
  id: 'uuid' as const,
  indexes: [index({ email: 1 }, { unique: true })],
});

describe('repository integration', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;
  let database: Db;

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), { directConnection: true });
    await client.connect();
    database = client.db('test');
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  it('insert and findById', async () => {
    const repo = createRepository(UserCollection, database);
    const result = await repo.insert({ name: 'Alice', email: 'alice@test.com' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const found = await repo.findById(result.value._id);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.name).toBe('Alice');
    expect(found.value?.email).toBe('alice@test.com');
  });

  it('insertMany all-or-nothing: invalid doc fails batch', async () => {
    const repo = createRepository(UserCollection, database);
    const result = await repo.insertMany([
      { name: 'Bob', email: 'bob@test.com' },
      { name: 'Bad', email: 'not-an-email' },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');

    // verify nothing was inserted
    const found = await repo.find({ name: 'Bob' } as Parameters<typeof repo.find>[0]);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value).toHaveLength(0);
  });

  it('updateById validates patch', async () => {
    const repo = createRepository(UserCollection, database);
    const inserted = await repo.insert({ name: 'Carol', email: 'carol@test.com' });
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;

    const updated = await repo.updateById(inserted.value._id, { email: 'not-valid' });
    expect(updated.ok).toBe(false);
    if (updated.ok) return;
    expect(updated.error.kind).toBe('validation');
  });

  it('duplicate key returns duplicate-key error', async () => {
    const repo = createRepository(UserCollection, database);
    await syncIndexes(UserCollection, database);
    await repo.insert({ name: 'Dave', email: 'dave@test.com' });
    const dup = await repo.insert({ name: 'Dave2', email: 'dave@test.com' });
    expect(dup.ok).toBe(false);
    if (dup.ok) return;
    expect(dup.error.kind).toBe('duplicate-key');
  });

  it('findById non-existent returns null', async () => {
    const repo = createRepository(UserCollection, database);
    const result = await repo.findById('00000000-0000-0000-0000-000000000000');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it('syncIndexes is idempotent', async () => {
    const r1 = await syncIndexes(UserCollection, database);
    const r2 = await syncIndexes(UserCollection, database);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it('find with empty filter returns all documents', async () => {
    const uniqueDb = client.db('test-find-all');
    const repo = createRepository(UserCollection, uniqueDb);
    await repo.insert({ name: 'Eve', email: 'eve@test.com' });
    await repo.insert({ name: 'Frank', email: 'frank@test.com' });
    const result = await repo.find();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBeGreaterThanOrEqual(2);
  });

  it('deleteById removes the document', async () => {
    const uniqueDb = client.db('test-delete');
    const repo = createRepository(UserCollection, uniqueDb);
    const inserted = await repo.insert({ name: 'Grace', email: 'grace@test.com' });
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;

    await repo.deleteById(inserted.value._id);
    const found = await repo.findById(inserted.value._id);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value).toBeNull();
  });
});

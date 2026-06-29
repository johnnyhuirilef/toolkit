import { randomUUID } from 'node:crypto';

import { MongoDBContainer, type StartedMongoDBContainer } from '@testcontainers/mongodb';
import type { Db } from 'mongodb';
import { MongoClient, ObjectId } from 'mongodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as z from 'zod';

import { createRepository, defineCollection, index, syncIndexes } from '../../src/index.js';

const schema = z.object({ name: z.string(), email: z.string().email() });

const UserCollection = defineCollection({
  name: 'users',
  schema,
  id: 'uuid' as const,
  indexes: [index({ email: 1 }, { unique: true })],
});

const ObjectIdCollection = defineCollection({
  name: 'items',
  schema: z.object({ label: z.string() }),
  id: 'objectid' as const,
});

const StringIdCollection = defineCollection({
  name: 'slugs',
  schema: z.object({ _id: z.string(), title: z.string() }),
  id: 'string' as const,
});

const NumericIdCollection = defineCollection({
  name: 'numeric',
  schema: z.object({ _id: z.number(), value: z.string() }),
  id: z.number(),
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

  it('find respects limit option', async () => {
    const uniqueDb = client.db('test-find-limit');
    const repo = createRepository(UserCollection, uniqueDb);
    await repo.insert({ name: 'Limit1', email: 'limit1@test.com' });
    await repo.insert({ name: 'Limit2', email: 'limit2@test.com' });
    await repo.insert({ name: 'Limit3', email: 'limit3@test.com' });

    const result = await repo.find({}, { limit: 2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
  });

  it('find respects sort option', async () => {
    const uniqueDb = client.db('test-find-sort');
    const repo = createRepository(UserCollection, uniqueDb);
    await repo.insert({ name: 'Zebra', email: 'z@test.com' });
    await repo.insert({ name: 'Alpha', email: 'a@test.com' });

    const result = await repo.find({}, { sort: { name: 1 } });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]?.name).toBe('Alpha');
    expect(result.value[1]?.name).toBe('Zebra');
  });

  it('findOne respects sort option', async () => {
    const uniqueDb = client.db('test-findone-sort');
    const repo = createRepository(UserCollection, uniqueDb);
    await repo.insert({ name: 'Charlie', email: 'charlie@test.com' });
    await repo.insert({ name: 'Alice', email: 'alice2@test.com' });

    const result = await repo.findOne({}, { sort: { name: 1 } });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.name).toBe('Alice');
  });

  it('findById with projection returns partial document', async () => {
    const uniqueDb = client.db('test-findbyid-projection');
    const repo = createRepository(UserCollection, uniqueDb);
    const inserted = await repo.insert({ name: 'Projected', email: 'proj@test.com' });
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;

    const result = await repo.findById(inserted.value._id, { projection: { name: 1 } });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.name).toBe('Projected');
  });

  it('updateMany with options applies patch to all matching documents', async () => {
    const uniqueDb = client.db('test-updatemany-options');
    const repo = createRepository(UserCollection, uniqueDb);
    await repo.insert({ name: 'Batch', email: 'batch1@test.com' });
    await repo.insert({ name: 'Batch', email: 'batch2@test.com' });

    const result = await repo.updateMany({ name: 'Batch' }, { name: 'Patched' }, {});

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.modifiedCount).toBe(2);

    const found = await repo.find({ name: 'Patched' });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value).toHaveLength(2);
  });

  it('updateById with comment option updates the document', async () => {
    const uniqueDb = client.db('test-updatebyid-options');
    const repo = createRepository(UserCollection, uniqueDb);
    const inserted = await repo.insert({ name: 'WithComment', email: 'comment@test.com' });
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;

    const result = await repo.updateById(
      inserted.value._id,
      { name: 'Updated' },
      { comment: 'wave1-options-test' },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.name).toBe('Updated');
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

describe('objectid strategy', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;
  let database: Db;

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), { directConnection: true });
    await client.connect();
    database = client.db('test-objectid');
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  const setup = () => ({ repo: createRepository(ObjectIdCollection, database) });

  it('should auto-generate an ObjectId on insert', async () => {
    const { repo } = setup();
    const result = await repo.insert({ label: 'hello' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toBeInstanceOf(ObjectId);
  });

  it('should find a document by its generated ObjectId', async () => {
    const { repo } = setup();
    const inserted = await repo.insert({ label: 'findme' });
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;

    const found = await repo.findById(inserted.value._id);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.label).toBe('findme');
  });

  it('should delete a document by its ObjectId', async () => {
    const { repo } = setup();
    const inserted = await repo.insert({ label: 'deleteme' });
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;

    await repo.deleteById(inserted.value._id);
    const found = await repo.findById(inserted.value._id);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value).toBeNull();
  });
});

describe('string strategy', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;
  let database: Db;

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), { directConnection: true });
    await client.connect();
    database = client.db('test-string');
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  const setup = () => ({ repo: createRepository(StringIdCollection, database) });

  it('should persist and retrieve a caller-supplied string _id', async () => {
    const { repo } = setup();
    const result = await repo.insert({ _id: 'my-slug', title: 'Hello World' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toBe('my-slug');

    const found = await repo.findById('my-slug');
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.title).toBe('Hello World');
  });

  it('should delete a document by its string _id', async () => {
    const { repo } = setup();
    await repo.insert({ _id: 'to-delete', title: 'Gone' });

    await repo.deleteById('to-delete');
    const found = await repo.findById('to-delete');
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value).toBeNull();
  });
});

describe('custom ZodCompat (numeric) strategy', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;
  let database: Db;

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), { directConnection: true });
    await client.connect();
    database = client.db('test-numeric');
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  const setup = () => ({ repo: createRepository(NumericIdCollection, database) });

  it('should persist and retrieve a caller-supplied numeric _id', async () => {
    const { repo } = setup();
    const result = await repo.insert({ _id: 1, value: 'one' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toBe(1);

    const found = await repo.findById(1);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.value).toBe('one');
  });

  it('should delete a document by its numeric _id', async () => {
    const { repo } = setup();
    await repo.insert({ _id: 99, value: 'temp' });

    await repo.deleteById(99);
    const found = await repo.findById(99);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value).toBeNull();
  });
});

describe('compound _id strategy (ZodCompat object)', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;
  let database: Db;

  const MembershipCollection = defineCollection({
    name: 'memberships',
    schema: z.object({
      _id: z.object({ tenantId: z.string(), userId: z.string() }),
      role: z.string(),
    }),
    id: z.object({ tenantId: z.string(), userId: z.string() }),
  });

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), { directConnection: true });
    await client.connect();
    database = client.db('test-compound');
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  const setup = () => ({ repo: createRepository(MembershipCollection, database) });

  it('should persist and retrieve a document with a compound _id', async () => {
    const { repo } = setup();
    const id = { tenantId: 'acme', userId: 'u1' };

    const result = await repo.insert({ _id: id, role: 'admin' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toEqual(id);

    const found = await repo.findById(id);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.role).toBe('admin');
  });

  it('should delete a document by its compound _id', async () => {
    const { repo } = setup();
    const id = { tenantId: 'acme', userId: 'u2' };

    await repo.insert({ _id: id, role: 'viewer' });
    await repo.deleteById(id);

    const found = await repo.findById(id);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value).toBeNull();
  });

  it('should treat different field orders as different documents', async () => {
    const { repo } = setup();
    const idAB = { tenantId: 'x', userId: 'y' };

    await repo.insert({ _id: idAB, role: 'owner' });

    // Querying with same values but different key order returns null
    const found = await repo.findById({ userId: 'y', tenantId: 'x' } as typeof idAB);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value).toBeNull();
  });

  it('should return a validation error when _id fails the id schema', async () => {
    const { repo } = setup();
    // _id missing required fields — fails z.object({ tenantId, userId })
    const result = await repo.insert({ _id: { tenantId: 'only' } as never, role: 'admin' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
  });
});

describe('count and exists', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;

  const CountCollection = defineCollection({
    name: 'counters',
    schema: z.object({ tag: z.string() }),
    id: 'uuid' as const,
  });

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), { directConnection: true });
    await client.connect();
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  const setup = (databaseName: string) => ({
    repo: createRepository(CountCollection, client.db(databaseName)),
  });

  it('count returns 0 for empty collection', async () => {
    const { repo } = setup('test-count-empty');
    const result = await repo.count();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(0);
  });

  it('count returns total when no filter given', async () => {
    const { repo } = setup('test-count-total');
    await repo.insert({ tag: 'a' });
    await repo.insert({ tag: 'b' });
    const result = await repo.count();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(2);
  });

  it('count with filter returns matching documents only', async () => {
    const { repo } = setup('test-count-filter');
    await repo.insert({ tag: 'target' });
    await repo.insert({ tag: 'other' });
    const result = await repo.count({ tag: 'target' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(1);
  });

  it('exists returns false when no document matches', async () => {
    const { repo } = setup('test-exists-false');
    const result = await repo.exists({ tag: 'ghost' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(false);
  });

  it('exists returns true when at least one document matches', async () => {
    const { repo } = setup('test-exists-true');
    await repo.insert({ tag: 'present' });
    const result = await repo.exists({ tag: 'present' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(true);
  });
});

describe('upsertById and upsertOne', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;

  const UpsertCollection = defineCollection({
    name: 'upserts',
    schema: z.object({ slug: z.string(), title: z.string() }),
    id: 'uuid' as const,
  });

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), { directConnection: true });
    await client.connect();
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  const setup = (databaseName: string) => ({
    repo: createRepository(UpsertCollection, client.db(databaseName)),
  });

  it('upsertById inserts document at given id when it does not exist', async () => {
    const { repo } = setup('test-upsert-true-insert');
    const id = randomUUID();
    const result = await repo.upsertById(id, { slug: 'new', title: 'New' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toBe(id);
    expect(result.value.slug).toBe('new');
  });

  it('upsertById replaces document at given id when it already exists', async () => {
    const { repo } = setup('test-upsert-replace-existing');
    const inserted = await repo.insert({ slug: 'seed', title: 'Seed' });
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;

    const result = await repo.upsertById(inserted.value._id, { slug: 'seed', title: 'Updated' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe('Updated');
    expect(result.value._id).toBe(inserted.value._id);
  });

  it('upsertOne inserts when no document matches filter and assigns id per strategy', async () => {
    const { repo } = setup('test-upsertone-insert');
    const result = await repo.upsertOne({ slug: 'ghost' }, { slug: 'ghost', title: 'Ghost' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.slug).toBe('ghost');
    expect(result.value.title).toBe('Ghost');
    // uuid strategy — _id must be a valid UUID string, not a MongoDB ObjectId
    expect(typeof result.value._id).toBe('string');
    expect(result.value._id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i,
    );
  });

  it('upsertOne replaces when document matches filter', async () => {
    const { repo } = setup('test-upsertone-replace');
    await repo.insert({ slug: 'existing', title: 'Before' });

    const result = await repo.upsertOne({ slug: 'existing' }, { slug: 'existing', title: 'After' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe('After');

    const count = await repo.count();
    expect(count.ok).toBe(true);
    if (!count.ok) return;
    expect(count.value).toBe(1);
  });

  it('upsertById returns validation error for invalid data', async () => {
    const { repo } = setup('test-upsert-validation');
    const inserted = await repo.insert({ slug: 'valid', title: 'Valid' });
    expect(inserted.ok).toBe(true);
    if (!inserted.ok) return;

    const result = await repo.upsertById(inserted.value._id, {
      slug: 123 as never,
      title: 'Bad',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
  });
});

describe('composite _id via custom ZodCompat schema', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;

  const CompositeId = z.object({ tenantId: z.string(), slug: z.string() });

  const ArticleCollection = defineCollection({
    name: 'articles',
    schema: z.object({ _id: CompositeId, title: z.string() }),
    id: CompositeId,
  });

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), { directConnection: true });
    await client.connect();
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  const setup = (databaseName: string) => ({
    repo: createRepository(ArticleCollection, client.db(databaseName)),
  });

  it('inserts a document with a composite _id', async () => {
    const { repo } = setup('test-composite-insert');
    const result = await repo.insert({ _id: { tenantId: 'acme', slug: 'hello' }, title: 'Hello' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toEqual({ tenantId: 'acme', slug: 'hello' });
    expect(result.value.title).toBe('Hello');
  });

  it('finds a document by composite _id', async () => {
    const { repo } = setup('test-composite-find');
    await repo.insert({ _id: { tenantId: 'acme', slug: 'hello' }, title: 'Hello' });

    const found = await repo.findById({ tenantId: 'acme', slug: 'hello' });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.title).toBe('Hello');
  });

  it('rejects invalid composite _id', async () => {
    const { repo } = setup('test-composite-validation');
    const result = await repo.insert({
      _id: { tenantId: 'acme', slug: 123 as never },
      title: 'Bad',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
  });

  it('updateById patches a document by composite _id', async () => {
    const { repo } = setup('test-composite-update');
    await repo.insert({ _id: { tenantId: 'acme', slug: 'update-me' }, title: 'Before' });

    const result = await repo.updateById(
      { tenantId: 'acme', slug: 'update-me' },
      { title: 'After' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.title).toBe('After');
    expect(result.value?._id).toEqual({ tenantId: 'acme', slug: 'update-me' });
  });

  it('deleteById removes a document by composite _id', async () => {
    const { repo } = setup('test-composite-delete');
    await repo.insert({ _id: { tenantId: 'acme', slug: 'delete-me' }, title: 'Gone' });

    const result = await repo.deleteById({ tenantId: 'acme', slug: 'delete-me' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?._id).toEqual({ tenantId: 'acme', slug: 'delete-me' });

    const gone = await repo.findById({ tenantId: 'acme', slug: 'delete-me' });
    expect(gone.ok).toBe(true);
    if (!gone.ok) return;
    expect(gone.value).toBeNull();
  });

  it('upsertById inserts with composite _id on insert-path', async () => {
    const { repo } = setup('test-composite-upsert-insert');
    const id = { tenantId: 'acme', slug: 'new-article' };

    const result = await repo.upsertById(id, { _id: id, title: 'New' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toEqual(id);
    expect(result.value.title).toBe('New');
  });

  it('upsertOne inserts with composite _id from data on insert-path', async () => {
    const { repo } = setup('test-composite-upsertone-insert');
    const id: z.infer<typeof CompositeId> = { tenantId: 'acme', slug: 'auto-article' };

    // filter by the full _id object — exact match required for composite _id
    const result = await repo.upsertOne({ _id: id }, { _id: id, title: 'Auto' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toEqual(id);
    expect(result.value.title).toBe('Auto');
  });
});

describe('updateRaw', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;

  const RawCollection = defineCollection({
    name: 'raw',
    schema: z.object({ tag: z.string(), count: z.number() }),
    id: 'uuid' as const,
  });

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7').start();
    client = new MongoClient(container.getConnectionString(), { directConnection: true });
    await client.connect();
  }, 90_000);

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  const setup = (databaseName: string) => ({
    repo: createRepository(RawCollection, client.db(databaseName)),
  });

  it('should apply $inc without $set wrapping', async () => {
    // Arrange
    const { repo } = setup('test-raw-inc');
    await repo.insert({ tag: 'a', count: 1 });
    await repo.insert({ tag: 'a', count: 1 });

    // Act
    const result = await repo.updateRaw({ tag: 'a' }, { $inc: { count: 10 } });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.modifiedCount).toBe(2);

    const found = await repo.find({ tag: 'a' });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value.every((document_) => document_.count === 11)).toBe(true);
  });

  it('should apply $set directly when passed as UpdateFilter', async () => {
    // Arrange
    const { repo } = setup('test-raw-set');
    await repo.insert({ tag: 'b', count: 0 });

    // Act
    const result = await repo.updateRaw({ tag: 'b' }, { $set: { count: 99 } });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.modifiedCount).toBe(1);

    const found = await repo.findOne({ tag: 'b' });
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.count).toBe(99);
  });

  it('should return modifiedCount zero when filter matches nothing', async () => {
    // Arrange
    const { repo } = setup('test-raw-nomatch');

    // Act
    const result = await repo.updateRaw({ tag: 'ghost' }, { $inc: { count: 1 } });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.modifiedCount).toBe(0);
  });
});

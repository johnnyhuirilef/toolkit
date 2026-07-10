import type {
  ClientSession,
  Document,
  FindOneAndUpdateOptions,
  FindOptions,
  UpdateFilter,
  UpdateOptions,
} from 'mongodb';
import { ObjectId } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import { findAndModifyResult } from './driver-shape.js';
import type { CollectionLike, DatabaseLike } from '../../src/collection-like.js';
import { defineCollection } from '../../src/collection.js';
import type { ZodCompat } from '../../src/compat/zod.js';
import { createRepository } from '../../src/mongo-repository.js';

const schema = z.object({ name: z.string() });

const TestCollection = defineCollection({ name: 'test', schema, id: 'uuid' as const });

type TestDoc = { _id: string; name: string };

const throwingIdSchema = z.object({ name: z.string() });

const throwingIdStrategy: ZodCompat<string> = {
  _output: '',
  parse: () => {
    throw new z.ZodError([]);
  },
};

const ThrowingIdCollection = defineCollection({
  name: 'throwing-id',
  schema: throwingIdSchema,
  id: throwingIdStrategy,
});

type ThrowingIdDoc = { _id: string; name: string };

const setupThrowingId = (overrides: Partial<CollectionLike<ThrowingIdDoc>> = {}) => {
  const coll = makeCollection<ThrowingIdDoc>(overrides);
  const repo = createRepository(ThrowingIdCollection, makeDb(coll));
  return { coll, repo };
};

const ObjectIdCollection = defineCollection({
  name: 'objectid-test',
  schema,
  id: 'objectid' as const,
});

type ObjectIdDoc = { _id: ObjectId; name: string };

const setupObjectId = (overrides: Partial<CollectionLike<ObjectIdDoc>> = {}) => {
  const coll = makeCollection<ObjectIdDoc>(overrides);
  const repo = createRepository(ObjectIdCollection, makeDb(coll));
  return { coll, repo };
};

const StringIdCollection = defineCollection({
  name: 'string-id-test',
  schema: z.object({ _id: z.string(), name: z.string() }),
  id: 'string' as const,
});

type StringIdDoc = { _id: string; name: string };

const setupStringId = (overrides: Partial<CollectionLike<StringIdDoc>> = {}) => {
  const coll = makeCollection<StringIdDoc>(overrides);
  const repo = createRepository(StringIdCollection, makeDb(coll));
  return { coll, repo };
};

// Bug repro: schema names its identity field `id`, not `_id` — the 'string'
// strategy contract requires `_id` itself, which this schema never declares.
const MisnamedStringIdCollection = defineCollection({
  name: 'misnamed-string-id-test',
  schema: z.object({ id: z.string(), name: z.string() }),
  id: 'string' as const,
});

type MisnamedStringIdDoc = { _id: string; id: string; name: string };

const setupMisnamedStringId = (overrides: Partial<CollectionLike<MisnamedStringIdDoc>> = {}) => {
  const coll = makeCollection<MisnamedStringIdDoc>(overrides);
  const repo = createRepository(MisnamedStringIdCollection, makeDb(coll));
  return { coll, repo };
};

const customIdSchema = z.object({ _id: z.string(), name: z.string() });

const customIdStrategy: ZodCompat<string> = {
  _output: '',
  parse: (data) => `custom-${data as string}`,
};

const CustomIdCollection = defineCollection({
  name: 'custom-id-test',
  schema: customIdSchema,
  id: customIdStrategy,
});

type CustomIdDoc = { _id: string; name: string };

const setupCustomId = (overrides: Partial<CollectionLike<CustomIdDoc>> = {}) => {
  const coll = makeCollection<CustomIdDoc>(overrides);
  const repo = createRepository(CustomIdCollection, makeDb(coll));
  return { coll, repo };
};

const makeCollection = <Doc extends Document = TestDoc>(
  overrides: Partial<CollectionLike<Doc>> = {},
): CollectionLike<Doc> => ({
  findOne: vi.fn().mockResolvedValue(null),
  find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
  findOneAndUpdate: vi.fn().mockResolvedValue(null),
  findOneAndReplace: vi.fn().mockResolvedValue(null),
  findOneAndDelete: vi.fn().mockResolvedValue(null),
  updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
  deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
  insertOne: vi.fn().mockResolvedValue({ insertedId: 'uuid-123' }),
  insertMany: vi.fn().mockResolvedValue({ insertedCount: 0 }),
  countDocuments: vi.fn().mockResolvedValue(0),
  aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
  ...overrides,
});

const makeDb = <Doc extends Document>(coll: CollectionLike<Doc>): DatabaseLike => ({
  collection: vi.fn().mockReturnValue(coll),
});

const setup = (overrides: Partial<CollectionLike<TestDoc>> = {}) => {
  const coll = makeCollection(overrides);
  const repo = createRepository(TestCollection, makeDb(coll));
  return { coll, repo };
};

describe('findById', () => {
  it('should pass options to the driver when provided', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({ findOne: vi.fn().mockResolvedValue(document_) });
    const options: FindOptions<TestDoc> = { projection: { name: 1 } };

    // Act
    const result = await repo.findById('uuid-1', options);

    // Assert
    expect(result.ok).toBe(true);
    expect(coll.findOne).toHaveBeenCalledWith({ _id: 'uuid-1' }, options);
  });

  it('should call driver without options when omitted', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    await repo.findById('uuid-1');

    // Assert
    expect(coll.findOne).toHaveBeenCalledWith({ _id: 'uuid-1' }, {});
  });
});

describe('findOne', () => {
  it('should pass options to the driver when provided', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-2', name: 'Bob' };
    const { coll, repo } = setup({ findOne: vi.fn().mockResolvedValue(document_) });
    const options: FindOptions<TestDoc> = { sort: { name: 1 } };

    // Act
    const result = await repo.findOne({ name: 'Bob' }, options);

    // Assert
    expect(result.ok).toBe(true);
    expect(coll.findOne).toHaveBeenCalledWith({ name: 'Bob' }, options);
  });

  it('should call driver without options when omitted', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    await repo.findOne({ name: 'Bob' });

    // Assert
    expect(coll.findOne).toHaveBeenCalledWith({ name: 'Bob' }, {});
  });
});

describe('find', () => {
  it('should pass options to the driver when provided', async () => {
    // Arrange
    const toArray = vi.fn().mockResolvedValue([]);
    const cursor = { toArray };
    const { coll, repo } = setup({ find: vi.fn().mockReturnValue(cursor) });
    const options: FindOptions<TestDoc> = { limit: 10, skip: 0, sort: { name: -1 } };

    // Act
    await repo.find({ name: 'Carol' }, options);

    // Assert
    expect(coll.find).toHaveBeenCalledWith({ name: 'Carol' }, options);
  });

  it('should default filter to empty object when omitted', async () => {
    // Arrange
    const toArray = vi.fn().mockResolvedValue([]);
    const cursor = { toArray };
    const { coll, repo } = setup({ find: vi.fn().mockReturnValue(cursor) });

    // Act
    await repo.find();

    // Assert
    expect(coll.find).toHaveBeenCalledWith({}, {});
  });
});

describe('count', () => {
  it('should call countDocuments with the given filter', async () => {
    // Arrange
    const { coll, repo } = setup({ countDocuments: vi.fn().mockResolvedValue(5) });

    // Act
    const result = await repo.count({ name: 'Alice' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(5);
    expect(coll.countDocuments).toHaveBeenCalledWith({ name: 'Alice' }, {});
  });

  it('should default filter to empty object when omitted', async () => {
    // Arrange
    const { coll, repo } = setup({ countDocuments: vi.fn().mockResolvedValue(0) });

    // Act
    await repo.count();

    // Assert
    expect(coll.countDocuments).toHaveBeenCalledWith({}, {});
  });

  it('should return an unknown error when the driver rejects', async () => {
    // Arrange
    const { repo } = setup({
      countDocuments: vi.fn().mockRejectedValue(new Error('connection dropped')),
    });

    // Act
    const result = await repo.count({ name: 'Alice' });

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('unknown');
    expect(result.error.message).toContain('connection dropped');
  });
});

describe('exists', () => {
  it('should call countDocuments with limit 1 and return true when a match is found', async () => {
    // Arrange
    const { coll, repo } = setup({ countDocuments: vi.fn().mockResolvedValue(1) });

    // Act
    const result = await repo.exists({ name: 'Alice' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(true);
    expect(coll.countDocuments).toHaveBeenCalledWith({ name: 'Alice' }, { limit: 1 });
  });

  it('should return false when no document matches', async () => {
    // Arrange
    const { repo } = setup({ countDocuments: vi.fn().mockResolvedValue(0) });

    // Act
    const result = await repo.exists({ name: 'Ghost' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(false);
  });

  it('should return an unknown error when the driver rejects', async () => {
    // Arrange
    const { repo } = setup({
      countDocuments: vi.fn().mockRejectedValue(new Error('connection dropped')),
    });

    // Act
    const result = await repo.exists({ name: 'Alice' });

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('unknown');
  });
});

describe('insert', () => {
  it('should return a validation error and never call the driver when data is invalid', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    // ponytail: JSON.parse yields `any`, letting invalid runtime shapes flow in without a type assertion.
    const invalidData = JSON.parse('{"name": 42}');
    const result = await repo.insert(invalidData);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
    expect(coll.insertOne).not.toHaveBeenCalled();
  });

  it("should generate and inject an ObjectId _id for the 'objectid' strategy", async () => {
    // Arrange
    const { coll, repo } = setupObjectId();

    // Act
    const result = await repo.insert({ name: 'Alice' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toBeInstanceOf(ObjectId);
    expect(coll.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.any(ObjectId), name: 'Alice' }),
      {},
    );
  });

  it("should generate and inject a string uuid _id for the 'uuid' strategy", async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    const result = await repo.insert({ name: 'Alice' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.value._id).toBe('string');
    expect(coll.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: expect.any(String), name: 'Alice' }),
      {},
    );
  });

  it("should pass the caller-supplied _id through unmodified for the 'string' strategy", async () => {
    // Arrange
    const { coll, repo } = setupStringId();

    // Act
    const result = await repo.insert({ _id: 'caller-id-1', name: 'Alice' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toBe('caller-id-1');
    expect(coll.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'caller-id-1', name: 'Alice' }),
      {},
    );
  });

  it('should parse _id through a custom ZodCompat id strategy', async () => {
    // Arrange
    const { coll, repo } = setupCustomId();

    // Act
    const result = await repo.insert({ _id: 'raw-1', name: 'Alice' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value._id).toBe('custom-raw-1');
    expect(coll.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'custom-raw-1', name: 'Alice' }),
      {},
    );
  });

  it('should return a validation error and never call the driver when the custom id strategy throws', async () => {
    // Arrange
    const { coll, repo } = setupThrowingId();

    // Act
    const result = await repo.insert({ name: 'Alice' });

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
    expect(coll.insertOne).not.toHaveBeenCalled();
  });

  it("should return a validation error and never call the driver for the 'string' strategy when _id is absent from the schema", async () => {
    // Arrange
    const { coll, repo } = setupMisnamedStringId();

    // Act
    const result = await repo.insert({ id: 'my-app-id-123', name: 'Alice' });

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
    expect(coll.insertOne).not.toHaveBeenCalled();
  });
});

describe('insertMany', () => {
  it('should return a validation error and never call the driver when any item is invalid', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    // ponytail: JSON.parse yields `any`, letting invalid runtime shapes flow in without a type assertion.
    const invalidItem = JSON.parse('{"name": 42}');
    const result = await repo.insertMany([{ name: 'Alice' }, invalidItem]);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
    expect(coll.insertMany).not.toHaveBeenCalled();
  });

  it('should insert all documents and return them in the Result value', async () => {
    // Arrange
    const { coll, repo } = setup({ insertMany: vi.fn().mockResolvedValue({ insertedCount: 2 }) });

    // Act
    const result = await repo.insertMany([{ name: 'Alice' }, { name: 'Bob' }]);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
    expect(result.value.map((document_) => document_.name)).toEqual(['Alice', 'Bob']);
    expect(coll.insertMany).toHaveBeenCalledWith(
      [expect.objectContaining({ name: 'Alice' }), expect.objectContaining({ name: 'Bob' })],
      {},
    );
  });

  it('should return an unknown error when the driver rejects', async () => {
    // Arrange
    const { repo } = setup({
      insertMany: vi.fn().mockRejectedValue(new Error('connection dropped')),
    });

    // Act
    const result = await repo.insertMany([{ name: 'Alice' }]);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('unknown');
    expect(result.error.message).toContain('connection dropped');
  });

  it("should return a validation error and never call the driver for the 'string' strategy when _id is absent from the schema", async () => {
    // Arrange
    const { coll, repo } = setupMisnamedStringId();

    // Act
    const result = await repo.insertMany([{ id: 'my-app-id-123', name: 'Alice' }]);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
    expect(coll.insertMany).not.toHaveBeenCalled();
  });
});

describe('upsertById', () => {
  it('should return a validation error and never call the driver when data is invalid', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    // ponytail: JSON.parse yields `any`, letting invalid runtime shapes flow in without a type assertion.
    const invalidData = JSON.parse('{"name": 42}');
    const result = await repo.upsertById('uuid-1', invalidData);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
    expect(coll.findOneAndReplace).not.toHaveBeenCalled();
  });

  it('should replace with upsert:true and returnDocument:after, keyed by the given id', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({
      findOneAndReplace: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    const result = await repo.upsertById('uuid-1', { name: 'Alice' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(document_);
    expect(coll.findOneAndReplace).toHaveBeenCalledWith(
      { _id: 'uuid-1' },
      expect.objectContaining({ name: 'Alice', _id: 'uuid-1' }),
      expect.objectContaining({ upsert: true, returnDocument: 'after' }),
    );
  });

  it('should return a not-found-derived error when the driver resolves null after write', async () => {
    // Arrange
    const { repo } = setup({ findOneAndReplace: vi.fn().mockResolvedValue(null) });

    // Act
    const result = await repo.upsertById('uuid-1', { name: 'Alice' });

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('not-found');
    expect(result.error.message).toContain('upsert returned null after write');
  });
});

describe('upsertOne', () => {
  it('should return a validation error and never call the driver when data is invalid', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    // ponytail: JSON.parse yields `any`, letting invalid runtime shapes flow in without a type assertion.
    const invalidData = JSON.parse('{"name": 42}');
    const result = await repo.upsertOne({ name: 'Alice' }, invalidData);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
    expect(coll.findOneAndReplace).not.toHaveBeenCalled();
  });

  it('should replace the matched document with upsert:true and returnDocument:after', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({
      findOne: vi.fn().mockResolvedValue(document_),
      findOneAndReplace: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    const result = await repo.upsertOne({ name: 'Alice' }, { name: 'Alice Updated' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(document_);
    expect(coll.findOneAndReplace).toHaveBeenCalledWith(
      { name: 'Alice' },
      expect.objectContaining({ name: 'Alice Updated', _id: 'uuid-1' }),
      expect.objectContaining({ upsert: true, returnDocument: 'after' }),
    );
  });

  it('should return a not-found-derived error when the driver resolves null after write', async () => {
    // Arrange
    const { repo } = setup({
      findOne: vi.fn().mockResolvedValue(null),
      findOneAndReplace: vi.fn().mockResolvedValue(null),
    });

    // Act
    const result = await repo.upsertOne({ name: 'Alice' }, { name: 'Alice' });

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('not-found');
    expect(result.error.message).toContain('upsert returned null after write');
  });

  it("should return a validation error and never call the driver on the insert-path for the 'string' strategy when _id is absent from the schema", async () => {
    // Arrange
    const { coll, repo } = setupMisnamedStringId({
      findOne: vi.fn().mockResolvedValue(null),
    });

    // Act
    const result = await repo.upsertOne(
      { id: 'my-app-id-123' },
      { id: 'my-app-id-123', name: 'Alice' },
    );

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
    expect(coll.findOneAndReplace).not.toHaveBeenCalled();
  });
});

describe('updateById', () => {
  it('should forward options to the driver when provided', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-3', name: 'Dave' };
    const { coll, repo } = setup({
      findOneAndUpdate: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });
    const options: FindOneAndUpdateOptions = { comment: 'test-update' };

    // Act
    const result = await repo.updateById('uuid-3', { name: 'Dave' }, options);

    // Assert
    expect(result.ok).toBe(true);
    expect(coll.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'uuid-3' },
      expect.objectContaining({ $set: expect.anything() }),
      expect.objectContaining({ returnDocument: 'after', ...options }),
    );
  });

  it('should call driver without extra options when omitted', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-4', name: 'Eve' };
    const { coll, repo } = setup({
      findOneAndUpdate: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    await repo.updateById('uuid-4', { name: 'Eve' });

    // Assert
    expect(coll.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'uuid-4' },
      expect.objectContaining({ $set: expect.anything() }),
      expect.objectContaining({ returnDocument: 'after' }),
    );
  });
});

describe('updateOne', () => {
  it('should forward options to the driver when provided', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-5', name: 'Frank' };
    const { coll, repo } = setup({
      findOneAndUpdate: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });
    const options: FindOneAndUpdateOptions = { comment: 'test-update-one' };

    // Act
    const result = await repo.updateOne({ name: 'Frank' }, { name: 'Frank Updated' }, options);

    // Assert
    expect(result.ok).toBe(true);
    expect(coll.findOneAndUpdate).toHaveBeenCalledWith(
      { name: 'Frank' },
      expect.objectContaining({ $set: expect.anything() }),
      expect.objectContaining({ returnDocument: 'after', ...options }),
    );
  });
});

describe('updateMany', () => {
  it('should forward options to the driver when provided', async () => {
    // Arrange
    const { coll, repo } = setup({
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 2 }),
    });
    const options: UpdateOptions = { comment: 'batch-update' };

    // Act
    const result = await repo.updateMany({ name: 'Grace' }, { name: 'Grace Updated' }, options);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.modifiedCount).toBe(2);
    expect(coll.updateMany).toHaveBeenCalledWith(
      { name: 'Grace' },
      expect.objectContaining({ $set: expect.anything() }),
      options,
    );
  });

  it('should call driver without options when omitted', async () => {
    // Arrange
    const { coll, repo } = setup({
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    });

    // Act
    await repo.updateMany({ name: 'Henry' }, { name: 'Henry Updated' });

    // Assert
    expect(coll.updateMany).toHaveBeenCalledWith(
      { name: 'Henry' },
      expect.objectContaining({ $set: expect.anything() }),
      {},
    );
  });
});

describe('updateRaw', () => {
  it('should pass the update filter directly to the driver without $set wrapping', async () => {
    // Arrange
    const { coll, repo } = setup({
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 3 }),
    });
    const update: UpdateFilter<{ _id: string; name: string }> = { $inc: { name: 1 } as never };

    // Act
    const result = await repo.updateRaw({}, update);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.modifiedCount).toBe(3);
    expect(coll.updateMany).toHaveBeenCalledWith({}, update, {});
  });

  it('should forward options to the driver when provided', async () => {
    // Arrange
    const { coll, repo } = setup({
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    });
    const update: UpdateFilter<{ _id: string; name: string }> = { $set: { name: 'raw' } };
    const options: UpdateOptions = { comment: 'raw-update' };

    // Act
    await repo.updateRaw({ name: 'old' }, update, options);

    // Assert
    expect(coll.updateMany).toHaveBeenCalledWith({ name: 'old' }, update, options);
  });

  it('should return modifiedCount zero when no documents match', async () => {
    // Arrange
    const { repo } = setup({
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    });

    // Act
    const result = await repo.updateRaw({ name: 'ghost' }, { $set: { name: 'x' } });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.modifiedCount).toBe(0);
  });
});

describe('deleteById', () => {
  it('should call findOneAndDelete keyed by id and return the deleted document', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({
      findOneAndDelete: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    const result = await repo.deleteById('uuid-1');

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(document_);
    expect(coll.findOneAndDelete).toHaveBeenCalledWith({ _id: 'uuid-1' }, {});
  });

  it('should return null when no document matches the id', async () => {
    // Arrange
    const { repo } = setup({ findOneAndDelete: vi.fn().mockResolvedValue(null) });

    // Act
    const result = await repo.deleteById('ghost-id');

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });
});

describe('deleteOne', () => {
  it('should call findOneAndDelete with the given filter and return the deleted document', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({
      findOneAndDelete: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    const result = await repo.deleteOne({ name: 'Alice' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(document_);
    expect(coll.findOneAndDelete).toHaveBeenCalledWith({ name: 'Alice' }, {});
  });

  it('should return null when no document matches the filter', async () => {
    // Arrange
    const { repo } = setup({ findOneAndDelete: vi.fn().mockResolvedValue(null) });

    // Act
    const result = await repo.deleteOne({ name: 'Ghost' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });
});

describe('deleteMany', () => {
  it('should call deleteMany with the given filter and return the deletedCount', async () => {
    // Arrange
    const { coll, repo } = setup({ deleteMany: vi.fn().mockResolvedValue({ deletedCount: 3 }) });

    // Act
    const result = await repo.deleteMany({ name: 'Alice' });

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.deletedCount).toBe(3);
    expect(coll.deleteMany).toHaveBeenCalledWith({ name: 'Alice' }, {});
  });

  it('should return an unknown error when the driver rejects', async () => {
    // Arrange
    const { repo } = setup({
      deleteMany: vi.fn().mockRejectedValue(new Error('connection dropped')),
    });

    // Act
    const result = await repo.deleteMany({ name: 'Alice' });

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('unknown');
    expect(result.error.message).toContain('connection dropped');
  });
});

describe('aggregate', () => {
  it('should call the driver aggregate with the given pipeline and parse each result through outputSchema', async () => {
    // Arrange
    const outputSchema = z.object({ total: z.number() });
    const toArray = vi.fn().mockResolvedValue([{ total: 1 }, { total: 2 }]);
    const { coll, repo } = setup({ aggregate: vi.fn().mockReturnValue({ toArray }) });
    const pipeline = [{ $group: { _id: null, total: { $sum: 1 } } }];

    // Act
    const result = await repo.aggregate(pipeline, outputSchema);

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([{ total: 1 }, { total: 2 }]);
    expect(coll.aggregate).toHaveBeenCalledWith(pipeline, {});
  });

  it('should return a validation error when a result document fails outputSchema parsing', async () => {
    // Arrange
    const outputSchema = z.object({ total: z.number() });
    const toArray = vi.fn().mockResolvedValue([{ total: 'not-a-number' }]);
    const { repo } = setup({ aggregate: vi.fn().mockReturnValue({ toArray }) });

    // Act
    const result = await repo.aggregate([], outputSchema);

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
  });

  it('should return an unknown error when the driver rejects', async () => {
    // Arrange
    const toArray = vi.fn().mockRejectedValue(new Error('connection dropped'));
    const { repo } = setup({ aggregate: vi.fn().mockReturnValue({ toArray }) });

    // Act
    const result = await repo.aggregate([], z.object({ total: z.number() }));

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('unknown');
    expect(result.error.message).toContain('connection dropped');
  });
});

// TASK-01: session() identity + contract
describe('session()', () => {
  const session = {} as ClientSession;

  it('repo.session(s) returns a distinct object from repo', () => {
    // Arrange
    const { repo } = setup();

    // Act
    const sessionRepo = repo.session(session);

    // Assert
    expect(sessionRepo).not.toBe(repo);
  });

  it('repo.session(s) satisfies Repository shape — all methods present', () => {
    // Arrange
    const { repo } = setup();

    // Act
    const sessionRepo = repo.session(session);

    // Assert
    const methods = [
      'findById',
      'findOne',
      'find',
      'query',
      'count',
      'exists',
      'insert',
      'insertMany',
      'upsertById',
      'upsertOne',
      'updateById',
      'updateOne',
      'updateMany',
      'updateRaw',
      'deleteById',
      'deleteOne',
      'deleteMany',
      'aggregate',
      'session',
    ];
    for (const method of methods) {
      expect(typeof (sessionRepo as Record<string, unknown>)[method]).toBe('function');
    }
  });

  it('base repo.findById does NOT receive session (no contamination)', async () => {
    // Arrange
    const { coll, repo } = setup();
    repo.session(session); // create a session repo — must not affect base

    // Act
    await repo.findById('uuid-1');

    // Assert
    expect(coll.findOne).toHaveBeenCalledWith(
      { _id: 'uuid-1' },
      expect.not.objectContaining({ session }),
    );
  });

  // TASK-02: reads thread session
  it('repo.session(s).findById threads session', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    await repo.session(session).findById('uuid-1');

    // Assert
    expect(coll.findOne).toHaveBeenCalledWith(
      { _id: 'uuid-1' },
      expect.objectContaining({ session }),
    );
  });

  it('repo.session(s).findOne threads session', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    await repo.session(session).findOne({ name: 'Alice' });

    // Assert
    expect(coll.findOne).toHaveBeenCalledWith(
      { name: 'Alice' },
      expect.objectContaining({ session }),
    );
  });

  it('repo.session(s).find threads session', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    await repo.session(session).find();

    // Assert
    expect(coll.find).toHaveBeenCalledWith({}, expect.objectContaining({ session }));
  });

  it('repo.session(s).count threads session', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    await repo.session(session).count({ name: 'Alice' });

    // Assert
    expect(coll.countDocuments).toHaveBeenCalledWith(
      { name: 'Alice' },
      expect.objectContaining({ session }),
    );
  });

  it('repo.session(s).exists threads session with limit: 1', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    await repo.session(session).exists({ name: 'Alice' });

    // Assert
    expect(coll.countDocuments).toHaveBeenCalledWith(
      { name: 'Alice' },
      expect.objectContaining({ session, limit: 1 }),
    );
  });

  it('repo.session(s).findById merges session with caller options (defensive merge)', async () => {
    // Arrange
    const { coll, repo } = setup();
    const options: FindOptions<TestDoc> = { projection: { name: 1 } };

    // Act
    await repo.session(session).findById('uuid-1', options);

    // Assert
    expect(coll.findOne).toHaveBeenCalledWith(
      { _id: 'uuid-1' },
      expect.objectContaining({ session, projection: { name: 1 } }),
    );
  });

  // TASK-03: writes + updates + upserts thread session
  it('repo.session(s).insert threads session', async () => {
    // Arrange
    const { coll, repo } = setup();

    // Act
    await repo.session(session).insert({ name: 'Alice' });

    // Assert
    expect(coll.insertOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session }),
    );
  });

  it('repo.session(s).insertMany threads session', async () => {
    // Arrange
    const { coll, repo } = setup({ insertMany: vi.fn().mockResolvedValue({ insertedCount: 1 }) });

    // Act
    await repo.session(session).insertMany([{ name: 'Alice' }]);

    // Assert
    expect(coll.insertMany).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session }),
    );
  });

  it('repo.session(s).updateById threads session', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({
      findOneAndUpdate: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    await repo.session(session).updateById('uuid-1', { name: 'Bob' });

    // Assert
    expect(coll.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ session, returnDocument: 'after' }),
    );
  });

  it('repo.session(s).updateOne threads session', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({
      findOneAndUpdate: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    await repo.session(session).updateOne({ name: 'Alice' }, { name: 'Bob' });

    // Assert
    expect(coll.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ session, returnDocument: 'after' }),
    );
  });

  it('repo.session(s).updateMany threads session', async () => {
    // Arrange
    const { coll, repo } = setup({ updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }) });

    // Act
    await repo.session(session).updateMany({ name: 'Alice' }, { name: 'Bob' });

    // Assert
    expect(coll.updateMany).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ session }),
    );
  });

  it('repo.session(s).updateRaw threads session', async () => {
    // Arrange
    const { coll, repo } = setup({ updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }) });

    // Act
    await repo.session(session).updateRaw({}, { $set: { name: 'Bob' } });

    // Assert
    expect(coll.updateMany).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ session }),
    );
  });

  it('repo.session(s).upsertById threads session', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({
      findOneAndReplace: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    await repo.session(session).upsertById('uuid-1', { name: 'Alice' });

    // Assert
    expect(coll.findOneAndReplace).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ session, upsert: true, returnDocument: 'after' }),
    );
  });

  it('repo.session(s).upsertOne threads session', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({
      findOne: vi.fn().mockResolvedValue(null),
      findOneAndReplace: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    await repo.session(session).upsertOne({ name: 'Alice' }, { name: 'Alice' });

    // Assert
    expect(coll.findOneAndReplace).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ session, upsert: true, returnDocument: 'after' }),
    );
    expect(coll.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session }),
    );
  });

  // TASK-04: deletes + aggregate + query() thread session
  it('repo.session(s).deleteById threads session', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({
      findOneAndDelete: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    await repo.session(session).deleteById('uuid-1');

    // Assert
    expect(coll.findOneAndDelete).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session }),
    );
  });

  it('repo.session(s).deleteOne threads session', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({
      findOneAndDelete: vi.fn().mockResolvedValue(findAndModifyResult(document_)),
    });

    // Act
    await repo.session(session).deleteOne({ name: 'Alice' });

    // Assert
    expect(coll.findOneAndDelete).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session }),
    );
  });

  it('repo.session(s).deleteMany threads session', async () => {
    // Arrange
    const { coll, repo } = setup({ deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }) });

    // Act
    await repo.session(session).deleteMany({ name: 'Alice' });

    // Assert
    expect(coll.deleteMany).toHaveBeenCalledWith(
      { name: 'Alice' },
      expect.objectContaining({ session }),
    );
  });

  it('repo.session(s).aggregate threads session', async () => {
    // Arrange
    const toArray = vi.fn().mockResolvedValue([]);
    const { coll, repo } = setup({ aggregate: vi.fn().mockReturnValue({ toArray }) });
    const outputSchema = z.object({ name: z.string() });

    // Act
    await repo.session(session).aggregate([], outputSchema);

    // Assert
    expect(coll.aggregate).toHaveBeenCalledWith([], expect.objectContaining({ session }));
  });

  it('repo.session(s).query().exec() threads session', async () => {
    // Arrange
    const toArray = vi.fn().mockResolvedValue([]);
    const { coll, repo } = setup({ find: vi.fn().mockReturnValue({ toArray }) });

    // Act
    await repo.session(session).query().exec();

    // Assert
    expect(coll.find).toHaveBeenCalledWith({}, expect.objectContaining({ session }));
  });

  it('repo.session(s).query() session survives chaining', async () => {
    // Arrange
    const toArray = vi.fn().mockResolvedValue([]);
    const { coll, repo } = setup({ find: vi.fn().mockReturnValue({ toArray }) });

    // Act
    await repo.session(session).query().filter({ name: 'x' }).sort({ name: 1 }).exec();

    // Assert
    expect(coll.find).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ session }));
  });

  it('session(s2) on a session-bound repo replaces s1 with s2', async () => {
    const s1 = { id: 'session-1' } as unknown as ClientSession;
    const s2 = { id: 'session-2' } as unknown as ClientSession;
    const { coll, repo } = setup({
      findOne: vi.fn().mockResolvedValue(null),
    });

    await repo.session(s1).session(s2).findById('uuid-1');

    expect(coll.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: s2 }),
    );
    expect(coll.findOne).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ session: s1 }),
    );
  });
});

// Bug #57: buildReplacement must propagate resolveId failures instead of
// silently falling through to a base object without _id.
describe('upsertOne — insert path with failing custom id strategy', () => {
  it('returns a validation error when resolveId fails on the insert path', async () => {
    // Arrange
    const { repo } = setupThrowingId();

    // Act
    const result = await repo.upsertOne({ name: 'Alice' }, { name: 'Alice' });

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('validation');
  });

  it('never calls the driver write when resolveId fails on the insert path', async () => {
    // Arrange
    const { coll, repo } = setupThrowingId();

    // Act
    await repo.upsertOne({ name: 'Alice' }, { name: 'Alice' });

    // Assert
    expect(coll.findOneAndReplace).not.toHaveBeenCalled();
  });
});

describe('upsertOne — driver failure on the pre-write lookup', () => {
  it('returns an err result instead of throwing when findOne rejects', async () => {
    // Arrange
    const { repo } = setup({
      findOne: vi.fn().mockRejectedValue(new Error('connection dropped')),
    });

    // Act
    const result = await repo.upsertOne({ name: 'Alice' }, { name: 'Alice' });

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('unknown');
    expect(result.error.message).toContain('connection dropped');
  });
});

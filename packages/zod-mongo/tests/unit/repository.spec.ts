import type {
  Collection,
  Db,
  FindOneAndUpdateOptions,
  FindOptions,
  UpdateFilter,
  UpdateOptions,
} from 'mongodb';
import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import { defineCollection } from '../../src/collection.js';
import { createRepository } from '../../src/mongo-repository.js';

const schema = z.object({ name: z.string() });

const TestCollection = defineCollection({ name: 'test', schema, id: 'uuid' as const });

type TestDoc = { _id: string; name: string };

const makeCollection = (overrides: Partial<Collection<TestDoc>> = {}) =>
  ({
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'uuid-123' }),
    countDocuments: vi.fn().mockResolvedValue(0),
    ...overrides,
  }) as unknown as Collection<TestDoc>;

const makeDb = (coll: Collection<TestDoc>) =>
  ({ collection: vi.fn().mockReturnValue(coll) }) as unknown as Db;

const setup = (overrides: Partial<Collection<TestDoc>> = {}) => {
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
    expect(coll.findOne).toHaveBeenCalledWith({ _id: 'uuid-1' }, undefined);
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
    expect(coll.findOne).toHaveBeenCalledWith({ name: 'Bob' }, undefined);
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
    expect(coll.find).toHaveBeenCalledWith({}, undefined);
  });
});

describe('updateById', () => {
  it('should forward options to the driver when provided', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-3', name: 'Dave' };
    const { coll, repo } = setup({ findOneAndUpdate: vi.fn().mockResolvedValue(document_) });
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
    const { coll, repo } = setup({ findOneAndUpdate: vi.fn().mockResolvedValue(document_) });

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
    const { coll, repo } = setup({ findOneAndUpdate: vi.fn().mockResolvedValue(document_) });
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
      undefined,
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
    expect(coll.updateMany).toHaveBeenCalledWith({}, update, undefined);
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

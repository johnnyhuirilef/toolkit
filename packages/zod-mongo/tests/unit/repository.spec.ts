import type {
  ClientSession,
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
    findOneAndReplace: vi.fn().mockResolvedValue(null),
    findOneAndDelete: vi.fn().mockResolvedValue(null),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'uuid-123' }),
    insertMany: vi.fn().mockResolvedValue({ insertedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
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
    const { coll, repo } = setup({ findOneAndUpdate: vi.fn().mockResolvedValue(document_) });

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
    const { coll, repo } = setup({ findOneAndUpdate: vi.fn().mockResolvedValue(document_) });

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
    const { coll, repo } = setup({ findOneAndReplace: vi.fn().mockResolvedValue(document_) });

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
      findOneAndReplace: vi.fn().mockResolvedValue(document_),
    });

    // Act
    await repo.session(session).upsertOne({ name: 'Alice' }, { name: 'Alice' });

    // Assert
    expect(coll.findOneAndReplace).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ session, upsert: true, returnDocument: 'after' }),
    );
  });

  // TASK-04: deletes + aggregate + query() thread session
  it('repo.session(s).deleteById threads session', async () => {
    // Arrange
    const document_: TestDoc = { _id: 'uuid-1', name: 'Alice' };
    const { coll, repo } = setup({ findOneAndDelete: vi.fn().mockResolvedValue(document_) });

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
    const { coll, repo } = setup({ findOneAndDelete: vi.fn().mockResolvedValue(document_) });

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
});

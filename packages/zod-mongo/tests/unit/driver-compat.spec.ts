import type { Filter, UpdateFilter } from 'mongodb';
import { describe, it, expect, vi } from 'vitest';

import { findAndModifyResult } from './driver-shape.js';
import type { FindOneAndModifyCollection } from '../../src/collection-like.js';
import { findOneAndModify } from '../../src/compat/driver.js';

// ponytail: MONGO_MAJOR is fixed at module load — we can't mock require() in ESM/Vitest.
// We test observable contract only: correct doc returned, null on no-match, correct method
// called. Mocks mirror the real installed driver's return shape (see driver-shape.ts).

type TestDoc = { _id: string; name: string };

const makeCollection = (
  overrides: Partial<FindOneAndModifyCollection<TestDoc>> = {},
): FindOneAndModifyCollection<TestDoc> => ({
  findOneAndUpdate: vi.fn().mockResolvedValue(null),
  findOneAndReplace: vi.fn().mockResolvedValue(null),
  findOneAndDelete: vi.fn().mockResolvedValue(null),
  ...overrides,
});

describe('findOneAndModify() — update path', () => {
  it('returns the document on update', async () => {
    const mockDoc: TestDoc = { _id: 'abc', name: 'updated' };
    const mockCollection = makeCollection({
      findOneAndUpdate: vi.fn().mockResolvedValue(findAndModifyResult(mockDoc)),
    });

    const result = await findOneAndModify(mockCollection, { _id: 'abc' } as Filter<TestDoc>, {
      kind: 'update',
      update: { $set: { name: 'updated' } } as UpdateFilter<TestDoc>,
    });

    expect(result).toEqual(mockDoc);
  });

  it('returns null when no document matches', async () => {
    const mockCollection = makeCollection();

    const result = await findOneAndModify(
      mockCollection,
      { _id: 'nonexistent' } as Filter<TestDoc>,
      { kind: 'update', update: { $set: { name: 'x' } } as UpdateFilter<TestDoc> },
    );

    expect(result).toBeNull();
  });

  it('calls findOneAndUpdate with returnDocument: after', async () => {
    const mockFindOneAndUpdate = vi.fn().mockResolvedValue(null);
    const mockCollection = makeCollection({ findOneAndUpdate: mockFindOneAndUpdate });

    await findOneAndModify(mockCollection, { _id: 'abc' } as Filter<TestDoc>, {
      kind: 'update',
      update: { $set: { name: 'updated' } } as UpdateFilter<TestDoc>,
    });

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'abc' },
      { $set: { name: 'updated' } },
      expect.objectContaining({ returnDocument: 'after' }),
    );
  });
});

describe('findOneAndModify() — delete path', () => {
  it('returns the document on delete', async () => {
    const mockDoc: TestDoc = { _id: 'abc', name: 'test' };
    const mockCollection = makeCollection({
      findOneAndDelete: vi.fn().mockResolvedValue(findAndModifyResult(mockDoc)),
    });

    const result = await findOneAndModify(mockCollection, { _id: 'abc' } as Filter<TestDoc>, {
      kind: 'delete',
    });

    expect(result).toEqual(mockDoc);
  });

  it('returns null when no document matches', async () => {
    const mockCollection = makeCollection();

    const result = await findOneAndModify(
      mockCollection,
      { _id: 'nonexistent' } as Filter<TestDoc>,
      { kind: 'delete' },
    );

    expect(result).toBeNull();
  });

  it('calls findOneAndDelete and NOT findOneAndUpdate', async () => {
    const mockFindOneAndDelete = vi.fn().mockResolvedValue(null);
    const mockFindOneAndUpdate = vi.fn();
    const mockCollection = makeCollection({
      findOneAndDelete: mockFindOneAndDelete,
      findOneAndUpdate: mockFindOneAndUpdate,
    });

    await findOneAndModify(mockCollection, { _id: 'abc' } as Filter<TestDoc>, { kind: 'delete' });

    expect(mockFindOneAndDelete).toHaveBeenCalledTimes(1);
    expect(mockFindOneAndUpdate).not.toHaveBeenCalled();
  });
});

import type { Collection } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import { createQueryBuilder } from '../../src/query-builder.js';

type TestDoc = { _id: string; name: string; score?: number };

const makeCursor = (documents: TestDoc[]) => ({
  toArray: vi.fn().mockResolvedValue(documents),
});

const makeCollection = (overrides: Partial<Collection<TestDoc>> = {}) =>
  ({
    find: vi.fn().mockReturnValue(makeCursor([])),
    ...overrides,
  }) as unknown as Collection<TestDoc>;

const setup = (overrides: Partial<Collection<TestDoc>> = {}) => {
  const coll = makeCollection(overrides);
  const builder = createQueryBuilder(coll);
  return { coll, builder };
};

describe('QueryBuilder — unit', () => {
  it('where(f).exec() calls coll.find with the given filter', async () => {
    // Arrange
    const { coll, builder } = setup();
    const filter = { name: 'Alice' };

    // Act
    await builder.where(filter).exec();

    // Assert
    expect(coll.find).toHaveBeenCalledWith(filter, expect.objectContaining({}));
  });

  it('sort(s).exec() passes sort in FindOptions second arg', async () => {
    // Arrange
    const { coll, builder } = setup();
    const sort = { score: -1 } as const;

    // Act
    await builder.sort(sort).exec();

    // Assert
    expect(coll.find).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sort }));
  });

  it('limit(n).exec() passes limit in FindOptions second arg', async () => {
    // Arrange
    const { coll, builder } = setup();

    // Act
    await builder.limit(5).exec();

    // Assert
    expect(coll.find).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 5 }),
    );
  });

  it('skip(n).exec() passes skip in FindOptions second arg', async () => {
    // Arrange
    const { coll, builder } = setup();

    // Act
    await builder.skip(3).exec();

    // Assert
    expect(coll.find).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ skip: 3 }));
  });

  it('full chain passes all accumulated state in a single coll.find call', async () => {
    // Arrange
    const { coll, builder } = setup();
    const filter = { name: 'Bob' };
    const sort = { score: -1 } as const;

    // Act
    await builder.where(filter).sort(sort).limit(10).skip(5).exec();

    // Assert
    expect(coll.find).toHaveBeenCalledTimes(1);
    expect(coll.find).toHaveBeenCalledWith(filter, { sort, limit: 10, skip: 5 });
  });

  it('immutability: two builders derived from the same base are independent', async () => {
    // Arrange
    const cursor1 = makeCursor([]);
    const cursor2 = makeCursor([]);
    let callCount = 0;
    const findMock = vi.fn().mockImplementation(() => {
      callCount++;
      return callCount === 1 ? cursor1 : cursor2;
    });
    const { builder } = setup({ find: findMock });

    // Act
    const b1 = builder.limit(5);
    const b2 = builder.limit(10);
    await b1.exec();
    await b2.exec();

    // Assert
    expect(findMock).toHaveBeenCalledTimes(2);
    expect(findMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ limit: 5 }),
    );
    expect(findMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ limit: 10 }),
    );
  });

  it('exec() returns { ok: true, value: [...] } on success', async () => {
    // Arrange
    const records: TestDoc[] = [{ _id: 'uuid-1', name: 'Alice', score: 42 }];
    const { builder } = setup({ find: vi.fn().mockReturnValue(makeCursor(records)) });

    // Act
    const result = await builder.exec();

    // Assert
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual(records);
  });

  it('exec() returns { ok: false, error: { kind: "unknown" } } when driver throws', async () => {
    // Arrange
    const crashingCursor = { toArray: vi.fn().mockRejectedValue(new Error('network error')) };
    const { builder } = setup({ find: vi.fn().mockReturnValue(crashingCursor) });

    // Act
    const result = await builder.exec();

    // Assert
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe('unknown');
  });
});

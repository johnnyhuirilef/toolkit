import { describe, it, expect, vi } from 'vitest';
import * as z from 'zod';

import type { DatabaseLike } from '../../src/collection-like.js';
import { defineCollection } from '../../src/collection.js';
import { generateIndexMigration, index, syncIndexes } from '../../src/indexes.js';

const schema = z.object({ email: z.string(), name: z.string() });

const makeDb = () => {
  const mockCreateIndexes = vi.fn().mockResolvedValue([]);
  const mockCollection = vi.fn().mockReturnValue({ createIndexes: mockCreateIndexes });
  const mockDb: DatabaseLike = { collection: mockCollection };
  return { mockDb, mockCollection, mockCreateIndexes };
};

describe('generateIndexMigration()', () => {
  describe('with indexes', () => {
    const col = defineCollection({
      name: 'users',
      schema,
      indexes: [index({ email: 1 }, { unique: true }), index({ name: 1 })],
    });

    it('output contains module.exports', () => {
      const output = generateIndexMigration(col);
      expect(output).toContain('module.exports');
    });

    it('output contains up function', () => {
      const output = generateIndexMigration(col);
      expect(output).toContain('up');
    });

    it('output contains down function', () => {
      const output = generateIndexMigration(col);
      expect(output).toContain('down');
    });

    it('output contains createIndexes', () => {
      const output = generateIndexMigration(col);
      expect(output).toContain('createIndexes');
    });

    it('output contains dropIndex', () => {
      const output = generateIndexMigration(col);
      expect(output).toContain('dropIndex');
    });

    it('collection name appears in output', () => {
      const output = generateIndexMigration(col);
      expect(output).toContain('users');
    });

    it('index spec keys appear in output', () => {
      const output = generateIndexMigration(col);
      expect(output).toContain('email');
      expect(output).toContain('name');
    });

    it('unique option appears in output', () => {
      const output = generateIndexMigration(col);
      expect(output).toContain('unique');
    });

    it('is a valid JS string (parsable)', () => {
      const output = generateIndexMigration(col);
      // Should not throw when evaluated as function body
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      expect(() => new Function(output)).not.toThrow();
    });
  });

  describe('with empty indexes', () => {
    const emptyCol = defineCollection({ name: 'logs', schema });

    it('output still contains module.exports', () => {
      const output = generateIndexMigration(emptyCol);
      expect(output).toContain('module.exports');
    });

    it('output still contains up', () => {
      const output = generateIndexMigration(emptyCol);
      expect(output).toContain('up');
    });

    it('output still contains down', () => {
      const output = generateIndexMigration(emptyCol);
      expect(output).toContain('down');
    });

    it('output does NOT contain createIndexes for empty array', () => {
      const output = generateIndexMigration(emptyCol);
      expect(output).not.toContain('createIndexes');
    });

    it('is a valid JS string (parsable)', () => {
      const output = generateIndexMigration(emptyCol);
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      expect(() => new Function(output)).not.toThrow();
    });
  });
});

describe('syncIndexes()', () => {
  describe('with indexes defined', () => {
    const col = defineCollection({
      name: 'users',
      schema,
      indexes: [index({ email: 1 }, { unique: true })],
    });

    it('returns ok result', async () => {
      const { mockDb } = makeDb();
      const result = await syncIndexes(col, mockDb);
      expect(result.ok).toBe(true);
    });

    it('calls collection() with correct collection name', async () => {
      const { mockDb, mockCollection } = makeDb();
      await syncIndexes(col, mockDb);
      expect(mockCollection).toHaveBeenCalledWith('users');
    });

    it('calls createIndexes once', async () => {
      const { mockDb, mockCreateIndexes } = makeDb();
      await syncIndexes(col, mockDb);
      expect(mockCreateIndexes).toHaveBeenCalledTimes(1);
    });

    it('calls createIndexes with correct index description', async () => {
      const { mockDb, mockCreateIndexes } = makeDb();
      await syncIndexes(col, mockDb);
      expect(mockCreateIndexes).toHaveBeenCalledWith([{ key: { email: 1 }, unique: true }]);
    });
  });

  describe('with no indexes', () => {
    const emptyCol = defineCollection({ name: 'logs', schema });

    it('returns ok result', async () => {
      const { mockDb } = makeDb();
      const result = await syncIndexes(emptyCol, mockDb);
      expect(result.ok).toBe(true);
    });

    it('does NOT call createIndexes', async () => {
      const { mockDb, mockCreateIndexes } = makeDb();
      await syncIndexes(emptyCol, mockDb);
      expect(mockCreateIndexes).not.toHaveBeenCalled();
    });

    it('does NOT call collection()', async () => {
      const { mockDb, mockCollection } = makeDb();
      await syncIndexes(emptyCol, mockDb);
      expect(mockCollection).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns err result when createIndexes throws', async () => {
      const mockCreateIndexes = vi.fn().mockRejectedValue(new Error('network error'));
      const mockCollection = vi.fn().mockReturnValue({ createIndexes: mockCreateIndexes });
      const mockDb: DatabaseLike = { collection: mockCollection };
      const col = defineCollection({ name: 'users', schema, indexes: [index({ email: 1 })] });

      const result = await syncIndexes(col, mockDb);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.kind).toBe('unknown');
    });
  });
});

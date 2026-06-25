import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import { defineCollection } from '../../src/collection.js';
import { index } from '../../src/indexes.js';

const schema = z.object({ name: z.string(), email: z.string() });

describe('defineCollection()', () => {
  describe('defaults', () => {
    it('sets default id to objectid when not provided', () => {
      const col = defineCollection({ name: 'users', schema });
      expect(col.id).toBe('objectid');
    });

    it('sets default indexes to empty array when not provided', () => {
      const col = defineCollection({ name: 'users', schema });
      expect(col.indexes).toEqual([]);
    });

    it('preserves provided name', () => {
      const col = defineCollection({ name: 'users', schema });
      expect(col.name).toBe('users');
    });

    it('preserves provided schema', () => {
      const col = defineCollection({ name: 'users', schema });
      expect(col.schema).toBe(schema);
    });
  });

  describe('custom options', () => {
    it('accepts explicit id strategy uuid', () => {
      const col = defineCollection({ name: 'users', schema, id: 'uuid' as const });
      expect(col.id).toBe('uuid');
    });

    it('accepts explicit id strategy string', () => {
      const col = defineCollection({ name: 'users', schema, id: 'string' as const });
      expect(col.id).toBe('string');
    });

    it('preserves provided indexes', () => {
      const index_ = index({ email: 1 }, { unique: true });
      const col = defineCollection({ name: 'users', schema, indexes: [index_] });
      expect(col.indexes).toHaveLength(1);
      expect(col.indexes[0]).toEqual(index_);
    });

    it('preserves multiple indexes in order', () => {
      const index1 = index({ email: 1 }, { unique: true });
      const index2 = index({ name: 1 });
      const col = defineCollection({ name: 'users', schema, indexes: [index1, index2] });
      expect(col.indexes).toHaveLength(2);
      expect(col.indexes[0]).toEqual(index1);
      expect(col.indexes[1]).toEqual(index2);
    });
  });

  describe('immutability', () => {
    it('returns a frozen object', () => {
      const col = defineCollection({ name: 'users', schema });
      expect(Object.isFrozen(col)).toBe(true);
    });

    it('indexes array is frozen', () => {
      const col = defineCollection({ name: 'users', schema, indexes: [index({ email: 1 })] });
      expect(Object.isFrozen(col.indexes)).toBe(true);
    });
  });
});

describe('index()', () => {
  it('returns IndexDef with correct spec', () => {
    const index_ = index({ email: 1 });
    expect(index_.spec).toEqual({ email: 1 });
  });

  it('returns IndexDef with undefined options when not provided', () => {
    const index_ = index({ email: 1 });
    expect(index_.options).toBeUndefined();
  });

  it('returns IndexDef with provided options', () => {
    const index_ = index({ email: 1 }, { unique: true });
    expect(index_.options).toEqual({ unique: true });
  });

  it('round-trips spec and options', () => {
    const spec = { email: 1 as const, createdAt: -1 as const };
    const options = { unique: false, sparse: true };
    const index_ = index(spec, options);
    expect(index_.spec).toEqual(spec);
    expect(index_.options).toEqual(options);
  });
});

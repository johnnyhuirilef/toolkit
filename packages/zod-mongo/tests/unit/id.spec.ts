import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import { generateId } from '../../src/id.js';

describe('generateId', () => {
  it('should return an ObjectId instance for objectid strategy', () => {
    expect(generateId('objectid')).toBeInstanceOf(ObjectId);
  });

  it('should return a valid UUID string for uuid strategy', () => {
    expect(generateId('uuid')).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i,
    );
  });

  it('should return a unique value on each call', () => {
    expect(generateId('objectid').toString()).not.toBe(generateId('objectid').toString());
    expect(generateId('uuid')).not.toBe(generateId('uuid'));
  });
});

describe('InferIdType — type-level contracts', () => {
  it('should carry objectid _id type through defineCollection', () => {
    const col = { _id: new ObjectId(), name: 'test' };
    expect(col._id).toBeInstanceOf(ObjectId);
  });

  it('should carry custom ZodCompat _id type (number) through schema', () => {
    const schema = z.object({ _id: z.number(), name: z.string() });
    const parsed = schema.parse({ _id: 42, name: 'item' });
    expect(parsed._id).toBe(42);
  });
});

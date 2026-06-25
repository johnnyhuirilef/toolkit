import type { ObjectId } from 'mongodb';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import type { CollectionDef, Doc } from '../../src/collection.js';
import { defineCollection } from '../../src/collection.js';
import type { Infer } from '../../src/compat/zod.js';
import type { InferIdType } from '../../src/id.js';

describe('InferIdType — type-level assertions', () => {
  it('InferIdType objectid → ObjectId', () => {
    expectTypeOf<InferIdType<'objectid'>>().toEqualTypeOf<ObjectId>();
  });

  it('InferIdType uuid → string', () => {
    expectTypeOf<InferIdType<'uuid'>>().toEqualTypeOf<string>();
  });

  it('InferIdType string → string', () => {
    expectTypeOf<InferIdType<'string'>>().toEqualTypeOf<string>();
  });

  it('InferIdType custom Zod number → number', () => {
    type IdType = InferIdType<z.ZodNumber>;
    expectTypeOf<IdType>().toEqualTypeOf<number>();
  });
});

describe('Doc type — type-level assertions', () => {
  it('Doc with objectid has _id: ObjectId', () => {
    type Schema = z.ZodObject<{ name: z.ZodString }>;
    type TestDoc = Doc<Schema, 'objectid'>;
    expectTypeOf<TestDoc['_id']>().toEqualTypeOf<ObjectId>();
  });

  it('Doc with uuid has _id: string', () => {
    type Schema = z.ZodObject<{ name: z.ZodString }>;
    type TestDoc = Doc<Schema, 'uuid'>;
    expectTypeOf<TestDoc['_id']>().toEqualTypeOf<string>();
  });

  it('Doc carries schema fields', () => {
    type Schema = z.ZodObject<{ name: z.ZodString }>;
    type TestDoc = Doc<Schema, 'objectid'>;
    expectTypeOf<TestDoc['name']>().toEqualTypeOf<string>();
  });
});

describe('Infer type — type-level assertions', () => {
  it('Infer extracts schema output type', () => {
    type Schema = z.ZodObject<{ email: z.ZodString; age: z.ZodNumber }>;
    type Extracted = Infer<Schema>;
    expectTypeOf<Extracted>().toEqualTypeOf<{ email: string; age: number }>();
  });
});

describe('defineCollection — type-level assertions', () => {
  it('infers CollectionDef with correct TId from explicit id option', () => {
    const nameSchema = z.object({ name: z.string() });
    const col = defineCollection({ name: 'users', schema: nameSchema, id: 'uuid' as const });
    expectTypeOf(col.id).toEqualTypeOf<'uuid'>();
    // use col.schema to avoid unused-value lint; parse confirms schema is a live ZodCompat instance
    expect(typeof col.schema.parse).toBe('function');
  });

  it('infers CollectionDef with objectid default when id not provided', () => {
    const nameSchema = z.object({ name: z.string() });
    const col = defineCollection({ name: 'users', schema: nameSchema });
    expectTypeOf(col.id).toEqualTypeOf<'objectid'>();
    expect(typeof col.schema.parse).toBe('function');
  });

  it('CollectionDef type carries correct schema and id generics', () => {
    type NameSchema = z.ZodObject<{ name: z.ZodString }>;
    type Col = CollectionDef<NameSchema, 'uuid'>;
    expectTypeOf<Col['id']>().toEqualTypeOf<'uuid'>();
  });
});

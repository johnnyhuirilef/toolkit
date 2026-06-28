import type { Document, Filter } from 'mongodb';

import type { Doc } from './collection.js';
import type { Infer, ZodCompat } from './compat/zod.js';
import type { IdStrategy, InferIdType } from './id.js';
import type { Result } from './result.js';

export type Repository<Schema extends ZodCompat, Id extends IdStrategy> = {
  findById(id: InferIdType<Id>): Promise<Result<Doc<Schema, Id> | null>>;
  findOne(filter: Filter<Doc<Schema, Id>>): Promise<Result<Doc<Schema, Id> | null>>;
  find(filter?: Filter<Doc<Schema, Id>>): Promise<Result<Doc<Schema, Id>[]>>;
  count(filter?: Filter<Doc<Schema, Id>>): Promise<Result<number>>;
  exists(filter: Filter<Doc<Schema, Id>>): Promise<Result<boolean>>;
  insert(data: Infer<Schema>): Promise<Result<Doc<Schema, Id>>>;
  insertMany(data: Infer<Schema>[]): Promise<Result<Doc<Schema, Id>[]>>;
  upsertById(id: InferIdType<Id>, data: Infer<Schema>): Promise<Result<Doc<Schema, Id>>>;
  upsertOne(filter: Filter<Doc<Schema, Id>>, data: Infer<Schema>): Promise<Result<Doc<Schema, Id>>>;
  updateById(
    id: InferIdType<Id>,
    patch: Partial<Infer<Schema>>,
  ): Promise<Result<Doc<Schema, Id> | null>>;
  updateOne(
    filter: Filter<Doc<Schema, Id>>,
    patch: Partial<Infer<Schema>>,
  ): Promise<Result<Doc<Schema, Id> | null>>;
  updateMany(
    filter: Filter<Doc<Schema, Id>>,
    patch: Partial<Infer<Schema>>,
  ): Promise<Result<{ modifiedCount: number }>>;
  deleteById(id: InferIdType<Id>): Promise<Result<Doc<Schema, Id> | null>>;
  deleteOne(filter: Filter<Doc<Schema, Id>>): Promise<Result<Doc<Schema, Id> | null>>;
  deleteMany(filter: Filter<Doc<Schema, Id>>): Promise<Result<{ deletedCount: number }>>;
  aggregate<Out extends ZodCompat>(
    pipeline: Document[],
    outputSchema: Out,
  ): Promise<Result<Infer<Out>[]>>;
};

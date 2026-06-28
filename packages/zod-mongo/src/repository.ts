import type { Db, Document, Filter, OptionalUnlessRequiredId, UpdateFilter } from 'mongodb';
import { isNullish, shake, tryit } from 'radashi';

import type { CollectionDef, Doc } from './collection.js';
import { findOneAndModify } from './compat/driver.js';
import type { Infer, ZodCompat } from './compat/zod.js';
import { toDbError } from './errors.js';
import { generateId } from './id.js';
import type { IdStrategy, InferIdType } from './id.js';
import { err, ok } from './result.js';
import type { Result } from './result.js';

export type Repository<Schema extends ZodCompat, Id extends IdStrategy> = {
  findById(id: InferIdType<Id>): Promise<Result<Doc<Schema, Id> | null>>;
  findOne(filter: Filter<Doc<Schema, Id>>): Promise<Result<Doc<Schema, Id> | null>>;
  find(filter?: Filter<Doc<Schema, Id>>): Promise<Result<Doc<Schema, Id>[]>>;
  insert(data: Infer<Schema>): Promise<Result<Doc<Schema, Id>>>;
  insertMany(data: Infer<Schema>[]): Promise<Result<Doc<Schema, Id>[]>>;
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

// ponytail: wraps driver promises — tryit returns [error, value] tuple, we map to our Result type
const runSafe = async <T>(operation: () => Promise<T>): Promise<Result<T>> => {
  const [error, value] = await tryit(operation)();
  return isNullish(error) ? ok(value as T) : err(toDbError(error));
};

export const createRepository = <Schema extends ZodCompat, Id extends IdStrategy>(
  collection: CollectionDef<Schema, Id>,
  database: Db,
): Repository<Schema, Id> => {
  type TDoc = Doc<Schema, Id>;
  // ponytail: Doc<Schema, Id> has a typed _id: InferIdType<Id> which conflicts with MongoDB's
  // internal WithId<T> wrapper. We narrow via explicit cast at each read site rather than widening
  // the collection type. The cast is safe: the driver returns the shape we inserted.
  const coll = database.collection<TDoc>(collection.name);
  const schema = collection.schema;
  const idStrategy = collection.id;

  const parseSchema = (data: unknown): Result<Infer<Schema>> => {
    try {
      return ok(schema.parse(data) as Infer<Schema>);
    } catch (error) {
      return err(toDbError(error));
    }
  };

  const parsePartialSchema = (data: unknown): Result<Partial<Infer<Schema>>> => {
    try {
      // ponytail: ZodCompat only guarantees parse() at the type level; partial() exists at runtime
      // for all Zod schemas. The defensive check avoids a hard dependency on Zod internals.
      const partial =
        'partial' in schema && typeof (schema as { partial?: unknown }).partial === 'function'
          ? (schema as { partial: () => ZodCompat }).partial()
          : schema;
      return ok(partial.parse(data) as Partial<Infer<Schema>>);
    } catch (error) {
      return err(toDbError(error));
    }
  };

  const buildDoc = (validated: Infer<Schema>): Result<TDoc> => {
    if (idStrategy === 'objectid' || idStrategy === 'uuid') {
      const id = generateId(idStrategy);
      // ponytail: Infer<Schema> is structurally unknown at this level; spreading requires a cast to object.
      // The result is Doc<Schema, Id> by construction (_id + validated fields).
      return ok({ ...(validated as object), _id: id } as TDoc);
    }
    if (typeof idStrategy === 'object' && 'parse' in idStrategy) {
      try {
        const id = idStrategy.parse((validated as Record<string, unknown>)['_id']);
        return ok({ ...(validated as object), _id: id } as TDoc);
      } catch (error) {
        return err(toDbError(error));
      }
    }
    // ponytail: 'string' strategy — caller embeds _id in data, no validation needed.
    return ok({ ...(validated as object) } as TDoc);
  };

  return {
    findById: (id) =>
      runSafe(() =>
        coll
          .findOne({ _id: id } as Filter<TDoc>)
          .then((found) => (isNullish(found) ? null : found) as TDoc | null),
      ),

    findOne: (filter) =>
      runSafe(() =>
        coll.findOne(filter).then((found) => (isNullish(found) ? null : found) as TDoc | null),
      ),

    find: (filter) =>
      runSafe(() => {
        // ponytail: Collection.find() is not Array.find() — unicorn cannot distinguish them.
        // eslint-disable-next-line unicorn/no-array-callback-reference
        const cursor = coll.find(filter ?? {});
        return cursor.toArray().then((records) => records as TDoc[]);
      }),

    insert: async (data) => {
      const parsed = parseSchema(data);
      if (!parsed.ok) return parsed as Result<TDoc>;
      const record = buildDoc(parsed.value);
      if (!record.ok) return record;
      return runSafe(async () => {
        await coll.insertOne(record.value as OptionalUnlessRequiredId<TDoc>);
        return record.value;
      });
    },

    insertMany: async (data) => {
      const parsedItems: Infer<Schema>[] = [];
      for (const item of data) {
        const result = parseSchema(item);
        if (!result.ok) return result as Result<TDoc[]>;
        parsedItems.push(result.value);
      }
      const built = parsedItems.map((item) => buildDoc(item));
      const failed = built.find((r) => !r.ok);
      if (failed) return failed as Result<TDoc[]>;
      const records = (built as { ok: true; value: TDoc }[]).map((r) => r.value);
      return runSafe(async () => {
        await coll.insertMany(records as OptionalUnlessRequiredId<TDoc>[]);
        return records;
      });
    },

    updateById: async (id, patch) => {
      const parsed = parsePartialSchema(patch);
      if (!parsed.ok) return parsed as Result<TDoc | null>;
      return runSafe(() =>
        findOneAndModify(coll, { _id: id } as Filter<TDoc>, {
          kind: 'update',
          update: { $set: shake(parsed.value) } as UpdateFilter<TDoc>,
        }).then((found) => (isNullish(found) ? null : found) as TDoc | null),
      );
    },

    updateOne: async (filter, patch) => {
      const parsed = parsePartialSchema(patch);
      if (!parsed.ok) return parsed as Result<TDoc | null>;
      return runSafe(() =>
        findOneAndModify(coll, filter, {
          kind: 'update',
          update: { $set: shake(parsed.value) } as UpdateFilter<TDoc>,
        }).then((found) => (isNullish(found) ? null : found) as TDoc | null),
      );
    },

    updateMany: async (filter, patch) => {
      const parsed = parsePartialSchema(patch);
      if (!parsed.ok) return parsed as Result<{ modifiedCount: number }>;
      return runSafe(() =>
        coll
          .updateMany(filter, { $set: shake(parsed.value) } as UpdateFilter<TDoc>)
          .then((result) => ({ modifiedCount: result.modifiedCount })),
      );
    },

    deleteById: (id) =>
      runSafe(() =>
        findOneAndModify(coll, { _id: id } as Filter<TDoc>, { kind: 'delete' }).then(
          (found) => (isNullish(found) ? null : found) as TDoc | null,
        ),
      ),

    deleteOne: (filter) =>
      runSafe(() =>
        findOneAndModify(coll, filter, { kind: 'delete' }).then(
          (found) => (isNullish(found) ? null : found) as TDoc | null,
        ),
      ),

    deleteMany: (filter) =>
      runSafe(() =>
        coll.deleteMany(filter).then((result) => ({ deletedCount: result.deletedCount })),
      ),

    aggregate: <Out extends ZodCompat>(pipeline: Document[], outputSchema: Out) =>
      runSafe(() =>
        coll
          .aggregate(pipeline)
          .toArray()
          .then((records) => records.map((r) => outputSchema.parse(r) as Infer<Out>)),
      ),
  };
};

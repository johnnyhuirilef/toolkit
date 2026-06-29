import type {
  ClientSession,
  Db,
  Document,
  Filter,
  OptionalUnlessRequiredId,
  UpdateFilter,
  WithoutId,
} from 'mongodb';
import { isNullish, shake, tryit } from 'radashi';

import type { CollectionDef, Doc } from './collection.js';
import { findOneAndModify } from './compat/driver.js';
import type { Infer, ZodCompat } from './compat/zod.js';
import { NotFoundError, toDbError } from './errors.js';
import { generateId } from './id.js';
import type { IdStrategy, InferIdType } from './id.js';
import { createQueryBuilder } from './query-builder.js';
import type { Repository } from './repository.js';
import { err, ok } from './result.js';
import type { Result } from './result.js';
import { runSafe } from './run-safe.js';

type RepositoryInternal = { session?: ClientSession };

export const createRepository = <Schema extends ZodCompat, Id extends IdStrategy>(
  collection: CollectionDef<Schema, Id>,
  database: Db,
  internal: RepositoryInternal = {},
): Repository<Schema, Id> => {
  type TDoc = Doc<Schema, Id>;
  const coll = database.collection<TDoc>(collection.name);
  const schema = collection.schema;
  const idStrategy = collection.id;
  const sessionOptions = shake({ session: internal.session });

  const parseSchema = (data: unknown): Result<Infer<Schema>> => {
    const [error, value] = tryit(() => schema.parse(data))();
    return error ? err(toDbError(error)) : ok(value as Infer<Schema>);
  };

  const parsePartialSchema = (data: unknown): Result<Partial<Infer<Schema>>> => {
    // ponytail: ZodCompat doesn't expose partial() — probe at runtime to avoid hard Zod dependency.
    const partial =
      'partial' in schema && typeof (schema as { partial?: unknown }).partial === 'function'
        ? (schema as { partial: () => ZodCompat }).partial()
        : schema;
    const [error, value] = tryit(() => partial.parse(data))();
    return error ? err(toDbError(error)) : ok(value as Partial<Infer<Schema>>);
  };

  const resolveId = (
    validated: Infer<Schema>,
  ): Result<{ inject: false } | { inject: true; id: InferIdType<Id> }> => {
    if (idStrategy === 'objectid' || idStrategy === 'uuid')
      return ok({ inject: true, id: generateId(idStrategy) as InferIdType<Id> });
    if (typeof idStrategy === 'object') {
      const [error, id] = tryit(() =>
        idStrategy.parse((validated as Record<string, unknown>)['_id']),
      )();
      return isNullish(error)
        ? ok({ inject: true, id: id as InferIdType<Id> })
        : err(toDbError(error));
    }
    return ok({ inject: false });
  };

  const buildDoc = (validated: Infer<Schema>): Result<TDoc> => {
    const resolved = resolveId(validated);
    if (!resolved.ok) return resolved;
    const base = validated as object;
    return ok((resolved.value.inject ? { ...base, _id: resolved.value.id } : { ...base }) as TDoc);
  };

  const buildReplacement = (validated: Infer<Schema>): WithoutId<TDoc> => {
    const resolved = resolveId(validated);
    const base = validated as object;
    return (
      resolved.ok && resolved.value.inject ? { ...base, _id: resolved.value.id } : base
    ) as WithoutId<TDoc>;
  };

  return {
    findById: (id, options?) =>
      runSafe(() =>
        coll
          .findOne({ _id: id } as Filter<TDoc>, { ...sessionOptions, ...options })
          .then((found) => (isNullish(found) ? null : found) as TDoc | null),
      ),

    findOne: (filter, options?) =>
      runSafe(() =>
        coll
          .findOne(filter, { ...sessionOptions, ...options })
          .then((found) => (isNullish(found) ? null : found) as TDoc | null),
      ),

    find: (filter?, options?) =>
      runSafe(() => {
        // ponytail: Collection.find() is not Array.find() — unicorn cannot distinguish them.
        // eslint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
        const cursor = coll.find(filter ?? {}, { ...sessionOptions, ...options });
        return cursor.toArray().then((records) => records as TDoc[]);
      }),

    query: () => createQueryBuilder<Schema, Id>(coll, undefined, internal),

    count: (filter) => runSafe(() => coll.countDocuments(filter ?? {}, sessionOptions)),

    exists: async (filter) => {
      const result = await runSafe(() =>
        coll.countDocuments(filter, { ...sessionOptions, limit: 1 }),
      );
      return result.ok ? { ok: true, value: result.value > 0 } : result;
    },

    insert: async (data) => {
      const parsed = parseSchema(data);
      if (!parsed.ok) return parsed as Result<TDoc>;
      const record = buildDoc(parsed.value);
      if (!record.ok) return record;
      return runSafe(async () => {
        await coll.insertOne(record.value as OptionalUnlessRequiredId<TDoc>, sessionOptions);
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
        await coll.insertMany(records as OptionalUnlessRequiredId<TDoc>[], sessionOptions);
        return records;
      });
    },

    upsertById: async (id, data) => {
      const parsed = parseSchema(data);
      if (!parsed.ok) return parsed as Result<TDoc>;
      const replacement = { ...(parsed.value as object), _id: id } as WithoutId<TDoc>;
      return runSafe(() =>
        findOneAndModify(coll, { _id: id } as Filter<TDoc>, {
          kind: 'upsert',
          replacement,
          options: sessionOptions,
        }).then((found) => {
          if (isNullish(found)) throw new NotFoundError('upsert returned null after write');
          return found as TDoc;
        }),
      );
    },

    upsertOne: async (filter, data) => {
      const parsed = parseSchema(data);
      if (!parsed.ok) return parsed as Result<TDoc>;
      return runSafe(async () => {
        const existing = await coll.findOne(filter, sessionOptions);
        // ponytail: preserve existing _id on replace-path; generate per strategy only on insert-path
        const replacement = isNullish(existing)
          ? buildReplacement(parsed.value)
          : ({ ...(parsed.value as object), _id: existing._id } as WithoutId<TDoc>);
        const found = await findOneAndModify(coll, filter, {
          kind: 'upsert',
          replacement,
          options: sessionOptions,
        });
        if (isNullish(found)) throw new NotFoundError('upsert returned null after write');
        return found as TDoc;
      });
    },

    updateById: async (id, patch, options?) => {
      const parsed = parsePartialSchema(patch);
      if (!parsed.ok) return parsed as Result<TDoc | null>;
      return runSafe(() =>
        findOneAndModify(coll, { _id: id } as Filter<TDoc>, {
          kind: 'update',
          update: { $set: shake(parsed.value) } as UpdateFilter<TDoc>,
          options: { ...sessionOptions, ...options },
        }).then((found) => (isNullish(found) ? null : found) as TDoc | null),
      );
    },

    updateOne: async (filter, patch, options?) => {
      const parsed = parsePartialSchema(patch);
      if (!parsed.ok) return parsed as Result<TDoc | null>;
      return runSafe(() =>
        findOneAndModify(coll, filter, {
          kind: 'update',
          update: { $set: shake(parsed.value) } as UpdateFilter<TDoc>,
          options: { ...sessionOptions, ...options },
        }).then((found) => (isNullish(found) ? null : found) as TDoc | null),
      );
    },

    updateMany: async (filter, patch, options?) => {
      const parsed = parsePartialSchema(patch);
      if (!parsed.ok) return parsed as Result<{ modifiedCount: number }>;
      return runSafe(() =>
        coll
          .updateMany(filter, { $set: shake(parsed.value) } as UpdateFilter<TDoc>, {
            ...sessionOptions,
            ...options,
          })
          .then((result) => ({ modifiedCount: result.modifiedCount })),
      );
    },

    updateRaw: (filter, update, options?) =>
      runSafe(() =>
        coll
          .updateMany(filter, update, { ...sessionOptions, ...options })
          .then((result) => ({ modifiedCount: result.modifiedCount })),
      ),

    deleteById: (id) =>
      runSafe(() =>
        findOneAndModify(coll, { _id: id } as Filter<TDoc>, {
          kind: 'delete',
          options: sessionOptions,
        }).then((found) => (isNullish(found) ? null : found) as TDoc | null),
      ),

    deleteOne: (filter) =>
      runSafe(() =>
        findOneAndModify(coll, filter, { kind: 'delete', options: sessionOptions }).then(
          (found) => (isNullish(found) ? null : found) as TDoc | null,
        ),
      ),

    deleteMany: (filter) =>
      runSafe(() =>
        coll
          .deleteMany(filter, sessionOptions)
          .then((result) => ({ deletedCount: result.deletedCount })),
      ),

    aggregate: <Out extends ZodCompat>(pipeline: Document[], outputSchema: Out) =>
      runSafe(() =>
        coll
          .aggregate(pipeline, sessionOptions)
          .toArray()
          .then((records) => records.map((r) => outputSchema.parse(r) as Infer<Out>)),
      ),

    session: (clientSession) => createRepository(collection, database, { session: clientSession }),
  };
};

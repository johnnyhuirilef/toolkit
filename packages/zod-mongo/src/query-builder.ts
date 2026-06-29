import type { Collection, Document, Filter, FindOptions, Sort } from 'mongodb';

import type { Doc } from './collection.js';
import type { ZodCompat } from './compat/zod.js';
import type { IdStrategy } from './id.js';
import type { Result } from './result.js';
import { runSafe } from './run-safe.js';

type QueryBuilderState<T extends Document> = {
  filter: Filter<T>;
  options: FindOptions<T>;
};

export type QueryBuilder<Schema extends ZodCompat, Id extends IdStrategy> = {
  where(filter: Filter<Doc<Schema, Id>>): QueryBuilder<Schema, Id>;
  sort(sort: Sort): QueryBuilder<Schema, Id>;
  limit(n: number): QueryBuilder<Schema, Id>;
  skip(n: number): QueryBuilder<Schema, Id>;
  exec(): Promise<Result<Doc<Schema, Id>[]>>;
};

const defaultState = <T extends Document>(): QueryBuilderState<T> => ({
  filter: {},
  options: {},
});

export const createQueryBuilder = <Schema extends ZodCompat, Id extends IdStrategy>(
  coll: Collection<Doc<Schema, Id>>,
  state?: QueryBuilderState<Doc<Schema, Id>>,
): QueryBuilder<Schema, Id> => {
  const resolvedState = state ?? defaultState<Doc<Schema, Id>>();
  return {
    where: (filter) => createQueryBuilder(coll, { ...resolvedState, filter }),
    sort: (sort) =>
      createQueryBuilder(coll, {
        ...resolvedState,
        options: { ...resolvedState.options, sort },
      }),
    limit: (n) =>
      createQueryBuilder(coll, {
        ...resolvedState,
        options: { ...resolvedState.options, limit: n },
      }),
    skip: (n) =>
      createQueryBuilder(coll, {
        ...resolvedState,
        options: { ...resolvedState.options, skip: n },
      }),
    exec: () =>
      runSafe(() => {
        // ponytail: Collection.find() is not Array.find() — unicorn cannot distinguish them.
        // eslint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
        const cursor = coll.find(resolvedState.filter, resolvedState.options);
        return cursor.toArray().then((records) => records as Doc<Schema, Id>[]);
      }),
  };
};

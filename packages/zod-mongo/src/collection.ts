import type { ZodCompat, Infer } from './compat/zod.js';
import type { IdStrategy, InferIdType } from './id.js';
import type { IndexDef } from './indexes.js';

export type Doc<Schema extends ZodCompat, Id extends IdStrategy> = Infer<Schema> & {
  readonly _id: InferIdType<Id>;
};

export type CollectionDef<Schema extends ZodCompat, Id extends IdStrategy> = {
  readonly name: string;
  readonly schema: Schema;
  readonly id: Id;
  readonly indexes: readonly IndexDef[];
  readonly __doc?: Doc<Schema, Id>;
};

export const defineCollection = <
  Schema extends ZodCompat,
  Id extends IdStrategy = 'objectid',
>(config: {
  name: string;
  schema: Schema;
  id?: Id;
  indexes?: IndexDef[];
}): CollectionDef<Schema, Id> =>
  Object.freeze({
    name: config.name,
    schema: config.schema,
    id: (config.id ?? 'objectid') as Id,
    indexes: Object.freeze(config.indexes ?? []),
  }) as CollectionDef<Schema, Id>;

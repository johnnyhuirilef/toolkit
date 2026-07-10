import { isNullish } from 'radashi';

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
  /** Id-generation strategy. Preferred over the deprecated `id` alias. */
  idStrategy?: Id;
  /** @deprecated Use `idStrategy` instead. */
  id?: Id;
  indexes?: IndexDef[];
}): CollectionDef<Schema, Id> => {
  // ponytail: reading the deprecated `id` alias here is the one legitimate call
  // site — defineCollection itself must resolve it, not just warn callers off it.
  /* eslint-disable @typescript-eslint/no-deprecated */
  if (!isNullish(config.id) && !isNullish(config.idStrategy))
    throw new Error(
      `Collection "${config.name}" received both 'id' and 'idStrategy' — 'id' is a deprecated ` +
        `alias for 'idStrategy'. Provide only one.`,
    );
  const resolvedId = config.idStrategy ?? config.id ?? 'objectid';
  /* eslint-enable @typescript-eslint/no-deprecated */
  return Object.freeze({
    name: config.name,
    schema: config.schema,
    id: resolvedId as Id,
    indexes: Object.freeze(config.indexes ?? []),
  }) as CollectionDef<Schema, Id>;
};

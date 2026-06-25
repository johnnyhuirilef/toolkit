import type { CreateIndexesOptions, Db, IndexDescription } from 'mongodb';
import { dedent, isEmpty, isNullish, tryit } from 'radashi';

import type { CollectionDef } from './collection.js';
import type { ZodCompat } from './compat/zod.js';
import { toDbError } from './errors.js';
import type { IdStrategy } from './id.js';
import { err, ok } from './result.js';
import type { Result } from './result.js';

// ponytail: IndexDescription.key is { [key: string]: IndexDirection } | Map — not the broader IndexSpecification.
// We alias it to IndexSpec so callers use the correct type that createIndexes() accepts.
export type IndexSpec = IndexDescription['key'];
export type IndexDef = { readonly spec: IndexSpec; readonly options?: CreateIndexesOptions };

export const index = (spec: IndexSpec, options?: CreateIndexesOptions): IndexDef => ({
  spec,
  options,
});

export const syncIndexes = async (
  collection: CollectionDef<ZodCompat, IdStrategy>,
  database: Db,
): Promise<Result<void>> => {
  if (isEmpty(collection.indexes)) return ok(void 0);
  const [error] = await tryit(() =>
    database
      .collection(collection.name)
      .createIndexes(
        collection.indexes.map((indexEntry) => ({ key: indexEntry.spec, ...indexEntry.options })),
      ),
  )();
  return isNullish(error) ? ok(void 0) : err(toDbError(error));
};

const emptyMigration = () => dedent`
  'use strict'

  module.exports = {
    async up(_db) {},
    async down(_db) {},
  }
`;

const indexMigration = (name: string, specs: string, names: string) => dedent`
  'use strict'

  module.exports = {
    async up(db) {
      await db.collection('${name}').createIndexes(${specs})
    },
    async down(db) {
      await db.collection('${name}').dropIndexes(${names})
    },
  }
`;

export const generateIndexMigration = (
  collection: CollectionDef<ZodCompat, IdStrategy>,
): string => {
  if (isEmpty(collection.indexes)) return emptyMigration();

  const specs = JSON.stringify(
    collection.indexes.map((indexEntry) => ({ key: indexEntry.spec, ...indexEntry.options })),
    null,
    2,
  );
  // ponytail: respect options.name if provided — MongoDB stores the index under that name,
  // so dropIndexes must use the same name or the rollback is a silent no-op
  const names = JSON.stringify(
    collection.indexes.map((indexEntry) => {
      if (indexEntry.options?.name) return indexEntry.options.name;
      const keys = Object.keys(indexEntry.spec as object);
      return keys
        .map((key) => `${key}_${String((indexEntry.spec as Record<string, number | string>)[key])}`)
        .join('_');
    }),
  );

  return indexMigration(collection.name, specs, names);
};

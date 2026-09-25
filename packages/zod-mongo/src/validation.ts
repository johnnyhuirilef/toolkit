import { isEmpty, isNullish, isObject } from 'radashi';

import type { DatabaseLike } from './collection-like.js';
import type { CollectionDef } from './collection.js';
import type { ZodCompat } from './compat/zod.js';
import { ConfigurationError } from './errors.js';
import type { IdStrategy } from './id.js';
import type { IndexDef, IndexSpec } from './indexes.js';

const describeType = (value: unknown): string => (value === null ? 'null' : typeof value);

// Checks exactly what the repository dereferences on a schema — parseSchema's `.parse()` and
// parsePartialSchema's own runtime probe for an optional `.partial()`. ZodCompat's `_output`
// field is a TypeScript-only phantom marker (declared for inference, never assigned at runtime),
// so a real Zod schema instance does not carry it — checking for it would reject every real schema.
export const validateZodCompat = (value: unknown): value is ZodCompat =>
  isObject(value) && 'parse' in value && typeof value.parse === 'function';

// Matches exactly the IdStrategy union declared in id.ts: three literal strings, or a
// Zod-compatible schema for a caller-supplied `_id`.
export const validateIdStrategy = (value: unknown): value is IdStrategy =>
  value === 'objectid' || value === 'uuid' || value === 'string' || validateZodCompat(value);

// IndexSpec (IndexDescription['key']) is a plain key/direction object, or a Map — the driver's
// own createIndexes() accepts either. generateIndexMigration()'s Object.keys() call only walks
// the plain-object case; that pre-existing gap is not something this boundary check should widen
// or narrow — it stays honest to the declared union.
const validateIndexSpec = (value: unknown): value is IndexSpec =>
  isObject(value) || value instanceof Map;

const validateIndexDefinition = (value: unknown): value is IndexDef =>
  isObject(value) && 'spec' in value && validateIndexSpec(value.spec);

export const ensureCollectionName = (name: string): string => {
  if (typeof name !== 'string')
    throw new ConfigurationError(
      `defineCollection() requires "name" to be a non-empty string. Received ${describeType(name)}.`,
    );
  if (isEmpty(name))
    throw new ConfigurationError('defineCollection() requires "name" to be a non-empty string.');
  return name;
};

export const ensureZodCompatSchema = <Schema extends ZodCompat>(
  schema: Schema,
  collectionName: string,
): Schema => {
  if (!validateZodCompat(schema))
    throw new ConfigurationError(
      `defineCollection("${collectionName}") requires "schema" to be a Zod-compatible schema ` +
        `(an object exposing "parse"). Received ${describeType(schema)}.`,
    );
  return schema;
};

export const ensureIndexDefs = (
  indexes: IndexDef[] | undefined,
  collectionName: string,
): IndexDef[] | undefined => {
  if (isNullish(indexes)) return indexes;
  if (!Array.isArray(indexes))
    throw new ConfigurationError(
      `defineCollection("${collectionName}") requires "indexes" to be an array of index ` +
        `definitions. Received ${describeType(indexes)}.`,
    );
  const invalidPosition = indexes.findIndex((entry) => !validateIndexDefinition(entry));
  if (invalidPosition !== -1)
    throw new ConfigurationError(
      `defineCollection("${collectionName}") received an invalid index definition at ` +
        `position ${String(invalidPosition)}. Build it with index(spec, options), or pass an ` +
        `object with a "spec" property.`,
    );
  return indexes;
};

export const ensureCollectionDefinition = <Schema extends ZodCompat, Id extends IdStrategy>(
  collection: CollectionDef<Schema, Id>,
): CollectionDef<Schema, Id> => {
  if (!isObject(collection))
    throw new ConfigurationError(
      `createRepository() requires "collection" to be the object returned by defineCollection(). ` +
        `Received ${describeType(collection)}.`,
    );
  if (typeof collection.name !== 'string' || isEmpty(collection.name))
    throw new ConfigurationError(
      `createRepository() requires "collection.name" to be a non-empty string — pass the object ` +
        `returned by defineCollection(), not a hand-built object.`,
    );
  if (!validateZodCompat(collection.schema))
    throw new ConfigurationError(
      `createRepository() requires "collection.schema" to be a Zod-compatible schema — pass the ` +
        `object returned by defineCollection(). Received ${describeType(collection.schema)}.`,
    );
  if (!validateIdStrategy(collection.id))
    throw new ConfigurationError(
      `createRepository() requires "collection.id" to be "objectid", "uuid", "string", or a ` +
        `Zod-compatible schema — pass the object returned by defineCollection(). Received ` +
        `${describeType(collection.id)}.`,
    );
  return collection;
};

// DatabaseLike (Pick<Db, 'collection'>) IS a structural type — the repository only ever calls
// `database.collection(name)`, so a structural check here is honest, not a shortcut around a
// nominal contract.
export const ensureDatabaseLike = (database: DatabaseLike): DatabaseLike => {
  if (!isObject(database) || typeof database.collection !== 'function')
    throw new ConfigurationError(
      `createRepository() requires "database" to be a Db-like object exposing a "collection" ` +
        `method. Received ${describeType(database)}.`,
    );
  return database;
};

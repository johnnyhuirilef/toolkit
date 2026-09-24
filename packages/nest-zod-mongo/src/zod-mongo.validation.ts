import { isEmpty, isObject, isNullish } from 'radashi';

import { MongoConfigurationError } from './zod-mongo.errors';
import type { MongoConnectionOptions, MongoConnectionOptionsWithUri } from './zod-mongo.interfaces';

// `connectionName` is typed as `string`, but plain JS callers (untyped calls, `Reflect.apply`)
// can still pass a non-string. Checking the runtime type first turns that into the same
// diagnostic error instead of a TypeError from `.includes` on a non-string value.
export const ensureConnectionName = (connectionName: string): string => {
  if (typeof connectionName !== 'string')
    throw new MongoConfigurationError(
      `Connection name must be a non-empty string. Received ${typeof connectionName}.`,
    );
  if (isEmpty(connectionName))
    throw new MongoConfigurationError('Connection name must be a non-empty string.');
  if (connectionName.includes('/'))
    throw new MongoConfigurationError(
      `Connection name "${connectionName}" must not contain "/". Use a name without "/".`,
    );
  return connectionName;
};

// Narrows an options-factory's resolved value without a cast — a value that isn't even an
// object (undefined, a Db, a string, ...) fails MongoOptions' own uri/mongoClient checks with a
// confusing message, so shape comes first.
export const validateOptionsShape = (value: unknown): value is MongoConnectionOptions =>
  isObject(value) && 'databaseName' in value && typeof value.databaseName === 'string';

const describeInvalidShape = (value: unknown): string => (value === null ? 'null' : typeof value);

// Exported so `resolveClient` (zod-mongo.providers.ts) narrows the same union through the same
// rule instead of re-implementing the "has a uri" check.
export const hasUri = (options: MongoConnectionOptions): options is MongoConnectionOptionsWithUri =>
  'uri' in options && typeof options.uri === 'string' && options.uri.length > 0;

const hasMongoClient = (options: MongoConnectionOptions): boolean =>
  'mongoClient' in options && !isNullish(options.mongoClient);

export const ensureValidOptions = (
  connectionName: string,
  value: unknown,
): MongoConnectionOptions => {
  if (!validateOptionsShape(value))
    throw new MongoConfigurationError(
      `MongoModule connection "${connectionName}" options factory returned ${describeInvalidShape(value)} instead of an options object. Return { databaseName, uri } or { databaseName, mongoClient }.`,
    );

  const sourceCount = Number(hasUri(value)) + Number(hasMongoClient(value));
  if (sourceCount === 0)
    throw new MongoConfigurationError(
      `MongoModule connection "${connectionName}" needs a "uri" or a "mongoClient" option. Pass one of them.`,
    );
  if (sourceCount === 2)
    throw new MongoConfigurationError(
      `MongoModule connection "${connectionName}" received both "uri" and "mongoClient". Pass only one of them.`,
    );

  return value;
};

type OptionsSources = {
  readonly useFactory?: unknown;
  readonly useClass?: unknown;
  readonly useExisting?: unknown;
};

// A mechanism only counts when it is actually usable: `useFactory` must be a function, and
// `useClass`/`useExisting` must be a class (also a function at runtime). `null` or any other
// non-callable value is treated as not provided — the same nullish rule applied to all three.
const isUsableMechanism = (value: unknown): boolean => typeof value === 'function';

// The MongoAsyncOptions union already rejects none/several mechanisms at compile time; this
// guards plain JS callers, so it accepts the loosest shape a caller could pass.
export const ensureSingleOptionsSource = <Sources extends OptionsSources>(
  connectionName: string,
  asyncOptions: Sources,
): Sources => {
  const providedCount =
    Number(isUsableMechanism(asyncOptions.useFactory)) +
    Number(isUsableMechanism(asyncOptions.useClass)) +
    Number(isUsableMechanism(asyncOptions.useExisting));

  if (providedCount === 0)
    throw new MongoConfigurationError(
      `MongoModule.forRootAsync() for connection "${connectionName}" requires one of "useFactory", "useClass" or "useExisting".`,
    );
  if (providedCount > 1)
    throw new MongoConfigurationError(
      `MongoModule.forRootAsync() for connection "${connectionName}" received more than one of "useFactory", "useClass", "useExisting". Pass exactly one.`,
    );

  return asyncOptions;
};

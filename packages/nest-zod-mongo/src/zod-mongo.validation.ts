import { isEmpty, isObject, isNullish } from 'radashi';

import { MongoConfigurationError } from './zod-mongo.errors';
import type { MongoConnectionOptions } from './zod-mongo.interfaces';

export const ensureConnectionName = (connectionName: string): string => {
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
  isObject(value) &&
  typeof (value as { readonly databaseName?: unknown }).databaseName === 'string';

const describeInvalidShape = (value: unknown): string => (value === null ? 'null' : typeof value);

const hasUri = (options: MongoConnectionOptions): boolean =>
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

// The MongoAsyncOptions union already rejects none/several mechanisms at compile time; this
// guards plain JS callers, so it accepts the loosest shape a caller could pass.
export const ensureSingleOptionsSource = <Sources extends OptionsSources>(
  connectionName: string,
  asyncOptions: Sources,
): Sources => {
  const providedCount =
    Number(asyncOptions.useFactory !== undefined) +
    Number(asyncOptions.useClass !== undefined) +
    Number(asyncOptions.useExisting !== undefined);

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

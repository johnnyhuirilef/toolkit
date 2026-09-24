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

// Matches exactly what the type claims: a value with a string `uri` key. An empty string still
// satisfies this shape, so it is rejected separately, by its own guard in `ensureValidOptions`,
// with its own message — this predicate must never grow a stricter rule than its type or
// `resolveClient` (zod-mongo.providers.ts) would narrow one way while this predicate reports
// another. Safe only because `resolveClient` always runs on an already-`ensureValidOptions`-ed
// value (see `establishConnection`), never on a raw, not-yet-checked one.
export const hasUri = (options: MongoConnectionOptions): options is MongoConnectionOptionsWithUri =>
  'uri' in options && typeof options.uri === 'string';

const hasMongoClient = (options: MongoConnectionOptions): boolean =>
  'mongoClient' in options && !isNullish(options.mongoClient);

export const ensureValidOptions = (
  connectionName: string,
  value: unknown,
): MongoConnectionOptions => {
  if (!isObject(value))
    throw new MongoConfigurationError(
      `MongoModule connection "${connectionName}" options factory returned ${describeInvalidShape(value)} instead of an options object. Return { databaseName, uri } or { databaseName, mongoClient }.`,
    );
  if (!validateOptionsShape(value))
    throw new MongoConfigurationError(
      `MongoModule connection "${connectionName}" requires a non-empty "databaseName" string.`,
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
  // `hasUri` accepts an empty string (it only checks the shape), so a caller who did pass a
  // "uri" gets this specific message instead of the generic "needs a uri or mongoClient" one.
  if (hasUri(value) && isEmpty(value.uri))
    throw new MongoConfigurationError(
      `MongoModule connection "${connectionName}" received an empty "uri" option. Pass a non-empty connection string.`,
    );

  return value;
};

type OptionsSources = {
  readonly useFactory?: unknown;
  readonly useClass?: unknown;
  readonly useExisting?: unknown;
};

// The MongoAsyncOptions union already rejects none/several mechanisms at compile time; this
// guards plain JS callers, so it accepts the loosest shape a caller could pass. "Provided" is
// judged first by presence (non-nullish) alone — a `useClass: 42` alongside a valid `useFactory`
// must still count as two provided mechanisms, even though `42` cannot be used. Only once exactly
// one mechanism is provided does its shape get checked, so a single non-callable mechanism gets
// its own diagnostic instead of silently falling through as "not provided".
export const ensureSingleOptionsSource = <Sources extends OptionsSources>(
  connectionName: string,
  asyncOptions: Sources,
): Sources => {
  const providedUseFactory = !isNullish(asyncOptions.useFactory);
  const providedUseClass = !isNullish(asyncOptions.useClass);
  const providedUseExisting = !isNullish(asyncOptions.useExisting);
  const providedCount =
    Number(providedUseFactory) + Number(providedUseClass) + Number(providedUseExisting);

  if (providedCount === 0)
    throw new MongoConfigurationError(
      `MongoModule.forRootAsync() for connection "${connectionName}" requires one of "useFactory", "useClass" or "useExisting".`,
    );
  if (providedCount > 1)
    throw new MongoConfigurationError(
      `MongoModule.forRootAsync() for connection "${connectionName}" received more than one of "useFactory", "useClass", "useExisting". Pass exactly one.`,
    );

  if (providedUseFactory && typeof asyncOptions.useFactory !== 'function')
    throw new MongoConfigurationError(
      `MongoModule.forRootAsync() for connection "${connectionName}" received a "useFactory" option that is not a function. Pass a factory function.`,
    );
  if (providedUseClass && typeof asyncOptions.useClass !== 'function')
    throw new MongoConfigurationError(
      `MongoModule.forRootAsync() for connection "${connectionName}" received a "useClass" option that is not a class. Pass a class implementing MongoOptionsFactory.`,
    );
  if (providedUseExisting && typeof asyncOptions.useExisting !== 'function')
    throw new MongoConfigurationError(
      `MongoModule.forRootAsync() for connection "${connectionName}" received a "useExisting" option that is not a class. Pass a class implementing MongoOptionsFactory.`,
    );

  return asyncOptions;
};

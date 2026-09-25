import { MongoClient } from 'mongodb';
import { isEmpty, isObject, isNullish } from 'radashi';

import { MongoConfigurationError } from './zod-mongo.errors';
import type {
  MongoConnectionOptions,
  MongoConnectionOptionsWithClient,
  MongoConnectionOptionsWithUri,
} from './zod-mongo.interfaces';

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
// confusing message, so shape comes first. This predicate only ever checks `databaseName`, so it
// must only ever claim what it checked — never the full `MongoConnectionOptions` union (uri XOR
// mongoClient). `ensureValidOptions` establishes the uri/mongoClient discriminant separately, one
// field at a time, so each malformed source gets its own diagnostic instead of a silent pass-through.
type DatabaseNameShape = { readonly databaseName: string };

export const validateOptionsShape = (value: unknown): value is DatabaseNameShape =>
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

// Each predicate below genuinely verifies its member's full shape (including the other field's
// absence), so declaring the narrower `MongoConnectionOptionsWith*` return type is truthful, not a
// disguised cast — same idiom as `hasUri` above. `ensureValidOptions` tries both positively first;
// only when neither passes does it re-walk the same fields to name which one is malformed.
const isValidUriOptions = (
  value: DatabaseNameShape,
): value is DatabaseNameShape & MongoConnectionOptionsWithUri =>
  'uri' in value &&
  typeof value.uri === 'string' &&
  !isEmpty(value.uri) &&
  !('mongoClient' in value && !isNullish(value.mongoClient));

const isValidMongoClientOptions = (
  value: DatabaseNameShape,
): value is DatabaseNameShape & MongoConnectionOptionsWithClient =>
  'mongoClient' in value &&
  // `instanceof`, not a method-name check: a structural check cannot justify the full MongoClient
  // type exposed to consumers. `mongodb` is a peer dependency, so the app supplies this same copy.
  value.mongoClient instanceof MongoClient &&
  !('uri' in value && !isNullish(value.uri));

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
  // mongodb 6.21: `new MongoClient(uri).db('').databaseName` falls back to the URI's own database
  // instead of failing, so an empty `databaseName` must be rejected here, before a connection is
  // ever attempted — otherwise data silently lands in the wrong database.
  if (isEmpty(value.databaseName))
    throw new MongoConfigurationError(
      `MongoModule connection "${connectionName}" requires a non-empty "databaseName" string.`,
    );

  if (isValidUriOptions(value)) return value;
  if (isValidMongoClientOptions(value)) return value;

  // Neither predicate passed — diagnose exactly why. "Provided" is judged by presence (key
  // present with a non-nullish value) first, matching `ensureSingleOptionsSource` below — a
  // malformed `uri` alongside a valid `mongoClient` must still count as "both provided", even
  // though the `uri` value cannot be used, so a single malformed source gets its own diagnostic
  // naming that field instead of silently falling through as "not provided".
  if ('uri' in value && !isNullish(value.uri)) {
    if ('mongoClient' in value && !isNullish(value.mongoClient))
      throw new MongoConfigurationError(
        `MongoModule connection "${connectionName}" received both "uri" and "mongoClient". Pass only one of them.`,
      );
    if (typeof value.uri !== 'string')
      throw new MongoConfigurationError(
        `MongoModule connection "${connectionName}" received a "uri" option that is not a string. Pass a connection string.`,
      );
    // The only remaining reason `isValidUriOptions` rejected a string, mongoClient-free uri.
    throw new MongoConfigurationError(
      `MongoModule connection "${connectionName}" received an empty "uri" option. Pass a non-empty connection string.`,
    );
  }

  if ('mongoClient' in value && !isNullish(value.mongoClient))
    throw new MongoConfigurationError(
      `MongoModule connection "${connectionName}" received a "mongoClient" option that is not an instance of MongoClient. Pass a MongoClient built from the same "mongodb" package your app depends on.`,
    );

  throw new MongoConfigurationError(
    `MongoModule connection "${connectionName}" needs a "uri" or a "mongoClient" option. Pass one of them.`,
  );
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

import { MongoClient } from 'mongodb';
import { describe, it, expect } from 'vitest';

import { MongoConfigurationError } from '../../src/zod-mongo.errors';
import type { MongoConnectionOptions } from '../../src/zod-mongo.interfaces';
import {
  ensureConnectionName,
  ensureSingleOptionsSource,
  ensureValidOptions,
  validateOptionsShape,
} from '../../src/zod-mongo.validation';

// Compile-time proof that `validateOptionsShape` narrows to a shape strictly smaller than
// `MongoConnectionOptions` — it only ever checked `databaseName`, so it must never claim the full
// uri-XOR-mongoClient union. If `validateOptionsShape` regresses to `value is MongoConnectionOptions`,
// this assignment stops needing the `@ts-expect-error` and `typecheck` fails on the unused directive.
function assertValidateOptionsShapeDoesNotNarrowToMongoConnectionOptions(value: unknown): void {
  if (validateOptionsShape(value)) {
    // @ts-expect-error a databaseName-only shape lacks the required uri/mongoClient discriminant
    const asConnectionOptions: MongoConnectionOptions = value;
    void asConnectionOptions;
  }
}
void assertValidateOptionsShapeDoesNotNarrowToMongoConnectionOptions;

const setup = () => ({
  ensureConnectionName,
  ensureSingleOptionsSource,
  ensureValidOptions,
  validateOptionsShape,
});

// Reflect.apply performs an untyped call, exactly like a plain JS caller: the `string`
// parameter type cannot express a non-string argument such as `42`.
const callAsUntypedCaller = (connectionName: unknown): unknown =>
  Reflect.apply(ensureConnectionName, undefined, [connectionName]);

// Reflect.apply performs an untyped call: a non-callable `useClass`/`useExisting` such as `42`
// cannot be expressed through OptionsSources' own (already loose) `unknown` fields once combined
// with a real function for another field, so this mirrors exactly what a plain JS caller sends.
const callEnsureSingleOptionsSourceAsUntypedCaller = (asyncOptions: object): unknown =>
  Reflect.apply(ensureSingleOptionsSource, undefined, ['orders', asyncOptions]);

describe('ensureConnectionName', () => {
  it('rejects an empty connection name with a MongoConfigurationError naming the remedy', () => {
    const { ensureConnectionName: sut } = setup();

    expect(() => sut('')).toThrow(MongoConfigurationError);
    expect(() => sut('')).toThrow(/non-empty string/);
  });

  it("rejects a connection name containing '/' with a MongoConfigurationError naming the remedy", () => {
    const { ensureConnectionName: sut } = setup();

    expect(() => sut('a/b')).toThrow(MongoConfigurationError);
    expect(() => sut('a/b')).toThrow(/must not contain/);
  });

  it('returns the connection name unchanged when it is valid', () => {
    const { ensureConnectionName: sut } = setup();

    expect(sut('orders')).toBe('orders');
  });

  it('rejects a non-string connection name from an untyped caller with MongoConfigurationError, not a TypeError', () => {
    expect(() => callAsUntypedCaller(42)).toThrow(MongoConfigurationError);
  });
});

describe('ensureValidOptions', () => {
  it('establishing a connection with neither uri nor mongoClient throws MongoConfigurationError naming the connection and the remedy', () => {
    const { ensureValidOptions: sut } = setup();

    expect(() => sut('orders', { databaseName: 'db' })).toThrow(MongoConfigurationError);
    expect(() => sut('orders', { databaseName: 'db' })).toThrow(/"orders"/);
    expect(() => sut('orders', { databaseName: 'db' })).toThrow(/"uri".*"mongoClient"/);
  });

  it('establishing a connection with both uri and mongoClient throws MongoConfigurationError naming the connection and the remedy', () => {
    const { ensureValidOptions: sut } = setup();
    const bothProvided = {
      databaseName: 'db',
      uri: 'mongodb://localhost',
      mongoClient: new MongoClient('mongodb://127.0.0.1:1'),
    };

    expect(() => sut('orders', bothProvided)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', bothProvided)).toThrow(/"orders"/);
    expect(() => sut('orders', bothProvided)).toThrow(/only one/);
  });

  it('an options value that does not satisfy the required shape throws MongoConfigurationError describing the required shape', () => {
    const { ensureValidOptions: sut } = setup();

    expect(() => sut('orders', undefined)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', undefined)).toThrow(/"orders"/);
    expect(() => sut('orders', undefined)).toThrow(/options object/);
  });

  it('an options object missing databaseName throws MongoConfigurationError stating databaseName is required', () => {
    const { ensureValidOptions: sut } = setup();
    const missingDatabaseName = { uri: 'mongodb://localhost' };

    expect(() => sut('orders', missingDatabaseName)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', missingDatabaseName)).toThrow(/"orders"/);
    expect(() => sut('orders', missingDatabaseName)).toThrow(/"databaseName"/);
  });

  it('rejects an empty uri with a MongoConfigurationError naming the connection and the remedy', () => {
    const { ensureValidOptions: sut } = setup();
    const emptyUri = { databaseName: 'db', uri: '' };

    expect(() => sut('orders', emptyUri)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', emptyUri)).toThrow(/"orders"/);
    expect(() => sut('orders', emptyUri)).toThrow(/empty "uri"/);
  });

  it('rejects an empty databaseName even when a valid uri is present, naming the connection and the remedy', () => {
    // mongodb 6.21: `new MongoClient('mongodb://localhost/from_uri').db('').databaseName` is
    // `'from_uri'` — an empty databaseName silently falls back to the URI's database instead of
    // failing loudly, so it must be rejected before a connection is ever established.
    const { ensureValidOptions: sut } = setup();
    const emptyDatabaseName = { databaseName: '', uri: 'mongodb://localhost/from_uri' };

    expect(() => sut('orders', emptyDatabaseName)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', emptyDatabaseName)).toThrow(/"orders"/);
    expect(() => sut('orders', emptyDatabaseName)).toThrow(/non-empty "databaseName"/);
  });

  it('rejects a uri option that is not a string, naming the connection and the field', () => {
    const { ensureValidOptions: sut } = setup();
    const nonStringUri = { databaseName: 'db', uri: 42 };

    expect(() => sut('orders', nonStringUri)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', nonStringUri)).toThrow(/"orders"/);
    expect(() => sut('orders', nonStringUri)).toThrow(/"uri".*not a string/);
  });

  it('rejects a mongoClient option that is not an instance of MongoClient, naming the connection and the field', () => {
    const { ensureValidOptions: sut } = setup();
    const nonClientMongoClient = { databaseName: 'db', mongoClient: 42 };

    expect(() => sut('orders', nonClientMongoClient)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', nonClientMongoClient)).toThrow(/"orders"/);
    expect(() => sut('orders', nonClientMongoClient)).toThrow(/"mongoClient"/);
  });

  // mongodb is a peerDependency: a plain object exposing the same four method names a MongoClient
  // has (connect/db/close/withSession) is NOT a real client — it would be exposed as one and
  // `db()` returning `undefined` would leak `undefined` as a Db. Only `instanceof MongoClient`,
  // checked against this package's own `mongodb` import, is accepted.
  it('rejects a mongoClient impostor exposing connect, db, close and withSession but not an instance of MongoClient', () => {
    const { ensureValidOptions: sut } = setup();
    const impostor = {
      connect: () => undefined,
      db: () => undefined,
      close: () => undefined,
      withSession: () => undefined,
    };
    const options = { databaseName: 'db', mongoClient: impostor };

    expect(() => sut('orders', options)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', options)).toThrow(/"orders"/);
    expect(() => sut('orders', options)).toThrow(/"mongoClient"/);
  });

  it('accepts a real MongoClient instance from the mongodb package without connecting', () => {
    const { ensureValidOptions: sut } = setup();
    const options = { databaseName: 'db', mongoClient: new MongoClient('mongodb://127.0.0.1:1') };

    expect(sut('orders', options)).toBe(options);
  });

  it('counts a malformed uri alongside a valid mongoClient as both sources provided (presence-first, before shape checks)', () => {
    const { ensureValidOptions: sut } = setup();
    const bothProvidedOneMalformed = {
      databaseName: 'db',
      uri: 42,
      mongoClient: new MongoClient('mongodb://127.0.0.1:1'),
    };

    expect(() => sut('orders', bothProvidedOneMalformed)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', bothProvidedOneMalformed)).toThrow(/"orders"/);
    expect(() => sut('orders', bothProvidedOneMalformed)).toThrow(/only one/);
  });

  it('returns the validated options unchanged when the shape and source are valid', () => {
    const { ensureValidOptions: sut } = setup();
    const options = { databaseName: 'db', uri: 'mongodb://localhost' };

    expect(sut('orders', options)).toBe(options);
  });
});

describe('ensureSingleOptionsSource', () => {
  it('rejects an async registration providing none of useFactory/useClass/useExisting', () => {
    const { ensureSingleOptionsSource: sut } = setup();
    const asyncOptions = {};

    expect(() => sut('orders', asyncOptions)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', asyncOptions)).toThrow(/"orders"/);
    expect(() => sut('orders', asyncOptions)).toThrow(/"useFactory".*"useClass".*"useExisting"/);
  });

  it('rejects an async registration providing more than one of useFactory/useClass/useExisting', () => {
    const { ensureSingleOptionsSource: sut } = setup();
    const asyncOptions = {
      useFactory: () => ({ databaseName: 'db', uri: 'mongodb://localhost' }),
      useClass: class FakeOptionsFactory {},
    };

    expect(() => sut('orders', asyncOptions)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', asyncOptions)).toThrow(/"orders"/);
    expect(() => sut('orders', asyncOptions)).toThrow(/exactly one/);
  });

  it('rejects a usable useFactory alongside a non-callable useClass as more than one provided mechanism', () => {
    const asyncOptions = {
      useFactory: () => ({ databaseName: 'db', uri: 'mongodb://localhost' }),
      useClass: 42,
    };

    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(
      MongoConfigurationError,
    );
    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(/"orders"/);
    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(/exactly one/);
  });

  it('rejects a non-callable useClass provided alone with a MongoConfigurationError naming the field and the remedy', () => {
    const asyncOptions = { useClass: 42 };

    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(
      MongoConfigurationError,
    );
    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(/"orders"/);
    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(
      /"useClass".*not a class/,
    );
  });

  it('rejects a non-callable useFactory provided alone with a MongoConfigurationError naming the field and the remedy', () => {
    const asyncOptions = { useFactory: 42 };

    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(
      MongoConfigurationError,
    );
    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(/"orders"/);
    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(
      /"useFactory".*not a function/,
    );
  });

  it('rejects a non-callable useExisting provided alone with a MongoConfigurationError naming the field and the remedy', () => {
    const asyncOptions = { useExisting: 42 };

    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(
      MongoConfigurationError,
    );
    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(/"orders"/);
    expect(() => callEnsureSingleOptionsSourceAsUntypedCaller(asyncOptions)).toThrow(
      /"useExisting".*not a class/,
    );
  });

  it('returns the async options unchanged when exactly one mechanism is provided', () => {
    const { ensureSingleOptionsSource: sut } = setup();
    const asyncOptions = {
      useFactory: () => ({ databaseName: 'db', uri: 'mongodb://localhost' }),
    };

    expect(sut('orders', asyncOptions)).toBe(asyncOptions);
  });

  it('treats a null useFactory as not provided, so it alone still throws "requires one of"', () => {
    const { ensureSingleOptionsSource: sut } = setup();
    const asyncOptions = { useFactory: null };

    expect(() => sut('orders', asyncOptions)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', asyncOptions)).toThrow(/requires one of/);
  });

  it('treats a null useClass as not provided, so it alone still throws "requires one of"', () => {
    const { ensureSingleOptionsSource: sut } = setup();
    const asyncOptions = { useClass: null };

    expect(() => sut('orders', asyncOptions)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', asyncOptions)).toThrow(/requires one of/);
  });

  it('treats a null useExisting as not provided, so it alone still throws "requires one of"', () => {
    const { ensureSingleOptionsSource: sut } = setup();
    const asyncOptions = { useExisting: null };

    expect(() => sut('orders', asyncOptions)).toThrow(MongoConfigurationError);
    expect(() => sut('orders', asyncOptions)).toThrow(/requires one of/);
  });

  it('a usable useFactory alongside a null useClass counts as exactly one mechanism', () => {
    const { ensureSingleOptionsSource: sut } = setup();
    const asyncOptions = {
      useFactory: () => ({ databaseName: 'db', uri: 'mongodb://localhost' }),
      useClass: null,
    };

    expect(sut('orders', asyncOptions)).toBe(asyncOptions);
  });
});

describe('validateOptionsShape', () => {
  it('accepts an object with a string databaseName', () => {
    const { validateOptionsShape: sut } = setup();

    expect(sut({ databaseName: 'db' })).toBe(true);
  });

  it('rejects undefined, null and non-object values', () => {
    const { validateOptionsShape: sut } = setup();

    expect(sut(undefined)).toBe(false);
    expect(sut(null)).toBe(false);
    expect(sut('not-an-object')).toBe(false);
  });

  it('rejects an object missing a string databaseName', () => {
    const { validateOptionsShape: sut } = setup();

    expect(sut({})).toBe(false);
  });
});

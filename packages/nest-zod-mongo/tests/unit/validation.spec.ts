import { MongoClient } from 'mongodb';
import { describe, it, expect } from 'vitest';

import { MongoConfigurationError } from '../../src/zod-mongo.errors';
import {
  ensureConnectionName,
  ensureSingleOptionsSource,
  ensureValidOptions,
  validateOptionsShape,
} from '../../src/zod-mongo.validation';

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
    expect(() => callAsUntypedCaller(42)).not.toThrow(TypeError);
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

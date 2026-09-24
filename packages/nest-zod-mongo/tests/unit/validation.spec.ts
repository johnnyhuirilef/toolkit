import { MongoClient } from 'mongodb';
import { describe, it, expect } from 'vitest';

import { MongoConfigurationError } from '../../src/zod-mongo.errors';
import {
  ensureConnectionName,
  ensureValidOptions,
  validateOptionsShape,
} from '../../src/zod-mongo.validation';

describe('ensureConnectionName', () => {
  it('rejects an empty connection name with a MongoConfigurationError naming the remedy', () => {
    expect(() => ensureConnectionName('')).toThrow(MongoConfigurationError);
    expect(() => ensureConnectionName('')).toThrow(/non-empty string/);
  });

  it("rejects a connection name containing '/' with a MongoConfigurationError naming the remedy", () => {
    expect(() => ensureConnectionName('a/b')).toThrow(MongoConfigurationError);
    expect(() => ensureConnectionName('a/b')).toThrow(/must not contain/);
  });

  it('returns the connection name unchanged when it is valid', () => {
    expect(ensureConnectionName('orders')).toBe('orders');
  });
});

describe('ensureValidOptions', () => {
  it('establishing a connection with neither uri nor mongoClient throws MongoConfigurationError naming the connection and the remedy', () => {
    expect(() => ensureValidOptions('orders', { databaseName: 'db' })).toThrow(
      MongoConfigurationError,
    );
    expect(() => ensureValidOptions('orders', { databaseName: 'db' })).toThrow(/"orders"/);
    expect(() => ensureValidOptions('orders', { databaseName: 'db' })).toThrow(
      /"uri".*"mongoClient"/,
    );
  });

  it('establishing a connection with both uri and mongoClient throws MongoConfigurationError naming the connection and the remedy', () => {
    const bothProvided = {
      databaseName: 'db',
      uri: 'mongodb://localhost',
      mongoClient: new MongoClient('mongodb://127.0.0.1:1'),
    };
    expect(() => ensureValidOptions('orders', bothProvided)).toThrow(MongoConfigurationError);
    expect(() => ensureValidOptions('orders', bothProvided)).toThrow(/"orders"/);
    expect(() => ensureValidOptions('orders', bothProvided)).toThrow(/only one/);
  });

  it('an options value that does not satisfy the required shape throws MongoConfigurationError describing the required shape', () => {
    expect(() => ensureValidOptions('orders', undefined)).toThrow(MongoConfigurationError);
    expect(() => ensureValidOptions('orders', undefined)).toThrow(/"orders"/);
    expect(() => ensureValidOptions('orders', undefined)).toThrow(/options object/);
  });

  it('returns the validated options unchanged when the shape and source are valid', () => {
    const options = { databaseName: 'db', uri: 'mongodb://localhost' };
    expect(ensureValidOptions('orders', options)).toBe(options);
  });
});

describe('validateOptionsShape', () => {
  it('accepts an object with a string databaseName', () => {
    expect(validateOptionsShape({ databaseName: 'db' })).toBe(true);
  });

  it('rejects undefined, null and non-object values', () => {
    expect(validateOptionsShape(undefined)).toBe(false);
    expect(validateOptionsShape(null)).toBe(false);
    expect(validateOptionsShape('not-an-object')).toBe(false);
  });

  it('rejects an object missing a string databaseName', () => {
    expect(validateOptionsShape({})).toBe(false);
  });
});

import { MongoClient } from 'mongodb';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import { ConfigurationError } from '../../src/errors.js';
import { index } from '../../src/indexes.js';
import {
  ensureCollectionDefinition,
  ensureCollectionName,
  ensureDatabaseLike,
  ensureIndexDefs,
  ensureZodCompatSchema,
  validateIdStrategy,
  validateZodCompat,
} from '../../src/validation.js';

const schema = z.object({ name: z.string() });

const setup = () => ({
  ensureCollectionName,
  ensureZodCompatSchema,
  ensureIndexDefs,
  ensureCollectionDefinition,
  ensureDatabaseLike,
  validateZodCompat,
  validateIdStrategy,
});

// Reflect.apply performs an untyped call, exactly like a plain JS caller: each parameter's
// declared type cannot express the malformed argument a real caller can still pass at runtime.
const callEnsureCollectionNameAsUntypedCaller = (name: unknown): unknown =>
  Reflect.apply(ensureCollectionName, undefined, [name]);

const callEnsureZodCompatSchemaAsUntypedCaller = (
  schemaArgument: unknown,
  name: unknown,
): unknown => Reflect.apply(ensureZodCompatSchema, undefined, [schemaArgument, name]);

const callEnsureIndexDefsAsUntypedCaller = (indexes: unknown, name: unknown): unknown =>
  Reflect.apply(ensureIndexDefs, undefined, [indexes, name]);

const callEnsureCollectionDefinitionAsUntypedCaller = (collection: unknown): unknown =>
  Reflect.apply(ensureCollectionDefinition, undefined, [collection]);

const callEnsureDatabaseLikeAsUntypedCaller = (database: unknown): unknown =>
  Reflect.apply(ensureDatabaseLike, undefined, [database]);

describe('validateZodCompat', () => {
  it('accepts a real Zod schema', () => {
    const { validateZodCompat: sut } = setup();

    expect(sut(schema)).toBe(true);
  });

  it('accepts any object exposing a parse function', () => {
    const { validateZodCompat: sut } = setup();

    expect(sut({ parse: () => undefined })).toBe(true);
  });

  it('rejects an object without a parse function', () => {
    const { validateZodCompat: sut } = setup();

    expect(sut({})).toBe(false);
  });

  it('rejects undefined, null and non-object values', () => {
    const { validateZodCompat: sut } = setup();

    expect(sut(undefined)).toBe(false);
    expect(sut(null)).toBe(false);
    expect(sut('schema')).toBe(false);
  });
});

describe('validateIdStrategy', () => {
  it('accepts the three built-in strategy literals', () => {
    const { validateIdStrategy: sut } = setup();

    expect(sut('objectid')).toBe(true);
    expect(sut('uuid')).toBe(true);
    expect(sut('string')).toBe(true);
  });

  it('accepts a Zod-compatible custom strategy', () => {
    const { validateIdStrategy: sut } = setup();

    expect(sut(schema)).toBe(true);
  });

  it('rejects a value that is none of the built-in literals or a Zod-compatible schema', () => {
    const { validateIdStrategy: sut } = setup();

    expect(sut(42)).toBe(false);
    expect(sut('uid')).toBe(false);
    expect(sut({})).toBe(false);
  });
});

describe('ensureCollectionName', () => {
  it('returns the name unchanged when it is a non-empty string', () => {
    const { ensureCollectionName: sut } = setup();

    expect(sut('users')).toBe('users');
  });

  it('rejects an empty string naming the fix', () => {
    const { ensureCollectionName: sut } = setup();

    expect(() => sut('')).toThrow(ConfigurationError);
    expect(() => sut('')).toThrow(/non-empty string/);
  });

  it('rejects a non-string name from an untyped caller with ConfigurationError, not a TypeError', () => {
    expect(() => callEnsureCollectionNameAsUntypedCaller(42)).toThrow(ConfigurationError);
    expect(() => callEnsureCollectionNameAsUntypedCaller(42)).not.toThrow(TypeError);
  });

  it('rejects null from an untyped caller, describing it as "null" rather than "object"', () => {
    expect(() => callEnsureCollectionNameAsUntypedCaller(null)).toThrow(ConfigurationError);
    expect(() => callEnsureCollectionNameAsUntypedCaller(null)).toThrow(/Received null\./);
  });
});

describe('ensureZodCompatSchema', () => {
  it('returns the schema unchanged when it is Zod-compatible', () => {
    const { ensureZodCompatSchema: sut } = setup();

    expect(sut(schema, 'users')).toBe(schema);
  });

  it('rejects a non-Zod-compatible schema from an untyped caller, naming "schema" and the collection', () => {
    expect(() => callEnsureZodCompatSchemaAsUntypedCaller({}, 'users')).toThrow(ConfigurationError);
    expect(() => callEnsureZodCompatSchemaAsUntypedCaller({}, 'users')).toThrow(/"schema"/);
    expect(() => callEnsureZodCompatSchemaAsUntypedCaller({}, 'users')).toThrow(/"users"/);
  });

  it('rejects a schema from an untyped caller with ConfigurationError, not a TypeError', () => {
    expect(() => callEnsureZodCompatSchemaAsUntypedCaller(42, 'users')).toThrow(ConfigurationError);
    expect(() => callEnsureZodCompatSchemaAsUntypedCaller(42, 'users')).not.toThrow(TypeError);
  });
});

describe('ensureIndexDefs', () => {
  it('returns undefined unchanged when indexes are not provided', () => {
    const { ensureIndexDefs: sut } = setup();

    expect(sut(undefined, 'users')).toBeUndefined();
  });

  it('returns the array unchanged when every entry is a valid index definition', () => {
    const { ensureIndexDefs: sut } = setup();
    const indexes = [index({ email: 1 })];

    expect(sut(indexes, 'users')).toBe(indexes);
  });

  it('accepts an index entry whose spec is a Map, matching the driver-accepted IndexSpec union', () => {
    const { ensureIndexDefs: sut } = setup();
    const indexes = [{ spec: new Map([['email', 1 as const]]) }];

    expect(sut(indexes, 'users')).toBe(indexes);
  });

  it('rejects a non-array value from an untyped caller, naming "indexes"', () => {
    expect(() => callEnsureIndexDefsAsUntypedCaller('not-an-array', 'users')).toThrow(
      ConfigurationError,
    );
    expect(() => callEnsureIndexDefsAsUntypedCaller('not-an-array', 'users')).toThrow(/"indexes"/);
  });

  it('rejects an array entry missing "spec", naming its position', () => {
    expect(() => callEnsureIndexDefsAsUntypedCaller([{}], 'users')).toThrow(ConfigurationError);
    expect(() => callEnsureIndexDefsAsUntypedCaller([{}], 'users')).toThrow(/position 0/);
  });
});

describe('ensureCollectionDefinition', () => {
  const collection = { name: 'users', schema, id: 'objectid' as const, indexes: [] };

  it('returns the collection definition unchanged when it is valid', () => {
    const { ensureCollectionDefinition: sut } = setup();

    expect(sut(collection)).toBe(collection);
  });

  it('rejects a non-object first argument with ConfigurationError, not a TypeError', () => {
    expect(() => callEnsureCollectionDefinitionAsUntypedCaller(undefined)).toThrow(
      ConfigurationError,
    );
    expect(() => callEnsureCollectionDefinitionAsUntypedCaller(undefined)).not.toThrow(TypeError);
  });

  it('rejects an object whose "name" is not a non-empty string, naming "collection.name"', () => {
    const malformed = { schema, id: 'objectid' };

    expect(() => callEnsureCollectionDefinitionAsUntypedCaller(malformed)).toThrow(
      ConfigurationError,
    );
    expect(() => callEnsureCollectionDefinitionAsUntypedCaller(malformed)).toThrow(
      /"collection\.name"/,
    );
  });

  it('rejects an object missing a Zod-compatible "schema", naming "collection.schema"', () => {
    const malformed = { name: 'users', schema: {}, id: 'objectid' };

    expect(() => callEnsureCollectionDefinitionAsUntypedCaller(malformed)).toThrow(
      ConfigurationError,
    );
    expect(() => callEnsureCollectionDefinitionAsUntypedCaller(malformed)).toThrow(
      /"collection\.schema"/,
    );
  });

  it('rejects an object whose "id" is not a valid id strategy, naming "collection.id"', () => {
    const malformed = { name: 'users', schema, id: 42 };

    expect(() => callEnsureCollectionDefinitionAsUntypedCaller(malformed)).toThrow(
      ConfigurationError,
    );
    expect(() => callEnsureCollectionDefinitionAsUntypedCaller(malformed)).toThrow(
      /"collection\.id"/,
    );
  });
});

describe('ensureDatabaseLike', () => {
  it('returns the database unchanged when it exposes a "collection" function', () => {
    const { ensureDatabaseLike: sut } = setup();
    // A real (unconnected) Db satisfies DatabaseLike genuinely — no fake needs to reproduce the
    // driver's full Collection<T> return type.
    const database = new MongoClient('mongodb://127.0.0.1:1').db('test');

    expect(sut(database)).toBe(database);
  });

  it('rejects an object without a "collection" function from an untyped caller, naming "database"', () => {
    expect(() => callEnsureDatabaseLikeAsUntypedCaller({})).toThrow(ConfigurationError);
    expect(() => callEnsureDatabaseLikeAsUntypedCaller({})).toThrow(/"database"/);
  });

  it('rejects undefined from an untyped caller with ConfigurationError, not a TypeError', () => {
    expect(() => callEnsureDatabaseLikeAsUntypedCaller(undefined)).toThrow(ConfigurationError);
    expect(() => callEnsureDatabaseLikeAsUntypedCaller(undefined)).not.toThrow(TypeError);
  });
});

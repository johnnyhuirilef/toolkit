import { MongoClient, MongoNetworkError, MongoNetworkTimeoutError } from 'mongodb';
import { describe, it, expect, beforeAll } from 'vitest';
import * as z from 'zod';

import { NotFoundError, toDbError } from '../../src/errors.js';

// MongoServerSelectionError's constructor is driver-internal (reads `reason.error`
// off a real TopologyDescription, which the driver never exports for construction).
// The only way to obtain a genuine instance is to let the driver produce one: connect
// to a port that refuses immediately, with a short server-selection timeout.
const makeServerSelectionError = async (): Promise<unknown> => {
  const client = new MongoClient('mongodb://127.0.0.1:1/', { serverSelectionTimeoutMS: 200 });
  try {
    await client.connect();
    throw new Error('expected connect() to reject with MongoServerSelectionError');
  } catch (error) {
    return error;
  } finally {
    await client.close();
  }
};

const makeZodError = (): unknown => {
  try {
    z.string().parse(123);
    return undefined;
  } catch (error) {
    return error;
  }
};

const makeDuplicateKeyError = (): Error =>
  Object.assign(new Error('E11000 duplicate key error'), { code: 11_000 });

describe('toDbError()', () => {
  describe('ZodError → validation', () => {
    it('maps ZodError to kind: validation', () => {
      const zodError = makeZodError();
      const result = toDbError(zodError);
      expect(result.kind).toBe('validation');
    });

    it('carries the ZodError as cause', () => {
      const zodError = makeZodError();
      const result = toDbError(zodError);
      expect(result.cause).toBe(zodError);
    });

    it('includes error message', () => {
      const zodError = makeZodError();
      const result = toDbError(zodError);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });
  });

  describe('Error with code 11000 → duplicate-key', () => {
    it('maps duplicate key error to kind: duplicate-key', () => {
      const error = makeDuplicateKeyError();
      const result = toDbError(error);
      expect(result.kind).toBe('duplicate-key');
    });

    it('carries the original error as cause', () => {
      const error = makeDuplicateKeyError();
      const result = toDbError(error);
      expect(result.cause).toBe(error);
    });

    it('preserves the message', () => {
      const error = makeDuplicateKeyError();
      const result = toDbError(error);
      expect(result.message).toBe(error.message);
    });
  });

  describe('MongoNetworkError → connection', () => {
    it('maps MongoNetworkError to kind: connection', () => {
      const error = new MongoNetworkError('connection refused');
      const result = toDbError(error);
      expect(result.kind).toBe('connection');
    });

    it('carries the original error as cause', () => {
      const error = new MongoNetworkError('connection refused');
      const result = toDbError(error);
      expect(result.cause).toBe(error);
    });

    it('preserves the message', () => {
      const error = new MongoNetworkError('connection refused');
      const result = toDbError(error);
      expect(result.message).toBe('connection refused');
    });
  });

  describe('MongoServerSelectionError → connection', () => {
    let error: unknown;

    beforeAll(async () => {
      error = await makeServerSelectionError();
    });

    it('maps MongoServerSelectionError to kind: connection', () => {
      const result = toDbError(error);
      expect(result.kind).toBe('connection');
    });

    it('carries the original error as cause', () => {
      const result = toDbError(error);
      expect(result.cause).toBe(error);
    });
  });

  describe('MongoNetworkTimeoutError (MongoNetworkError subclass) → connection', () => {
    it('maps MongoNetworkTimeoutError to kind: connection via instanceof MongoNetworkError', () => {
      const error = new MongoNetworkTimeoutError('network timeout');
      const result = toDbError(error);
      expect(result.kind).toBe('connection');
    });
  });

  describe('NotFoundError → not-found', () => {
    it('maps NotFoundError to kind: not-found', () => {
      const error = new NotFoundError('document missing');
      const result = toDbError(error);
      expect(result.kind).toBe('not-found');
    });

    it('carries the original error as cause', () => {
      const error = new NotFoundError('document missing');
      const result = toDbError(error);
      expect(result.cause).toBe(error);
    });

    it('preserves the message', () => {
      const error = new NotFoundError('document missing');
      const result = toDbError(error);
      expect(result.message).toBe('document missing');
    });
  });

  describe('generic Error → unknown', () => {
    it('maps generic Error to kind: unknown', () => {
      const result = toDbError(new Error('ECONNRESET'));
      expect(result.kind).toBe('unknown');
    });

    it('carries the original error as cause', () => {
      const error = new Error('ECONNRESET');
      const result = toDbError(error);
      expect(result.cause).toBe(error);
    });

    it('preserves the message', () => {
      const error = new Error('ECONNRESET');
      const result = toDbError(error);
      expect(result.message).toBe('ECONNRESET');
    });

    it('does not match code 11000 on plain Error without code property', () => {
      const error = new Error('plain error');
      const result = toDbError(error);
      expect(result.kind).toBe('unknown');
    });
  });

  describe('non-Error values → unknown', () => {
    it('maps string to kind: unknown with String(value) message', () => {
      const result = toDbError('raw string error');
      expect(result.kind).toBe('unknown');
      expect(result.message).toBe('raw string error');
    });

    it('maps number to kind: unknown', () => {
      const result = toDbError(42);
      expect(result.kind).toBe('unknown');
      expect(result.message).toBe('42');
    });

    it('maps null to kind: unknown', () => {
      const result = toDbError(null);
      expect(result.kind).toBe('unknown');
      expect(result.message).toBe('null');
    });

    it('maps object to kind: unknown', () => {
      const result = toDbError({ custom: true });
      expect(result.kind).toBe('unknown');
      expect(result.message).toContain('[object Object]');
    });

    it('has no cause for non-Error values', () => {
      const result = toDbError('bare string');
      expect(result.cause).toBeUndefined();
    });
  });
});

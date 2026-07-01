import { describe, it, expect } from 'vitest';
import * as z from 'zod';

import { NotFoundError, toDbError } from '../../src/errors.js';

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

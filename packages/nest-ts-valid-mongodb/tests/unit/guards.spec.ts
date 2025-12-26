import { describe, it, expect } from 'vitest';
import { isValidConnectionWrapper, isConnectionToken } from '../../src/lib/core/guards';

describe('isValidConnectionWrapper', () => {
  it('returns false for null', () => {
    expect(isValidConnectionWrapper(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidConnectionWrapper(undefined)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isValidConnectionWrapper(42)).toBe(false);
    expect(isValidConnectionWrapper('string')).toBe(false);
    expect(isValidConnectionWrapper(true)).toBe(false);
  });

  it('returns false for object without close method', () => {
    expect(isValidConnectionWrapper({})).toBe(false);
  });

  it('returns false for object without client property', () => {
    const invalidWrapper = {
      close: () => Promise.resolve(),
    };
    expect(isValidConnectionWrapper(invalidWrapper)).toBe(false);
  });

  it('returns false for object with non-function close', () => {
    const invalidWrapper = {
      close: 'not a function',
      client: {},
    };
    expect(isValidConnectionWrapper(invalidWrapper)).toBe(false);
  });

  it('returns true for valid wrapper with close function and client', () => {
    const validWrapper = {
      close: () => Promise.resolve(),
      client: {},
    };
    expect(isValidConnectionWrapper(validWrapper)).toBe(true);
  });

  it('returns true for wrapper with async close function', () => {
    const validWrapper = {
      close: async () => {},
      client: {},
    };
    expect(isValidConnectionWrapper(validWrapper)).toBe(true);
  });
});

describe('isConnectionToken', () => {
  it('returns true for string tokens', () => {
    expect(isConnectionToken('test-token')).toBe(true);
    expect(isConnectionToken('')).toBe(true);
  });

  it('returns true for symbol tokens', () => {
    expect(isConnectionToken(Symbol('test'))).toBe(true);
    expect(isConnectionToken(Symbol())).toBe(true);
  });

  it('returns false for null', () => {
    expect(isConnectionToken(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isConnectionToken(undefined)).toBe(false);
  });

  it('returns false for numbers', () => {
    expect(isConnectionToken(42)).toBe(false);
  });

  it('returns false for objects', () => {
    expect(isConnectionToken({})).toBe(false);
    expect(isConnectionToken({ token: 'value' })).toBe(false);
  });

  it('returns false for arrays', () => {
    expect(isConnectionToken([])).toBe(false);
  });
});

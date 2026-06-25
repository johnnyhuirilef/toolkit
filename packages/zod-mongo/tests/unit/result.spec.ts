import { describe, it, expect, expectTypeOf } from 'vitest';

import { ok, err, isOk, isErr } from '../../src/result.js';
import type { Err, Ok, Result } from '../../src/result.js';

describe('ok()', () => {
  it('returns { ok: true, value }', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(42);
  });

  it('works with string value', () => {
    const result = ok('hello');
    expect(result).toEqual({ ok: true, value: 'hello' });
  });

  it('works with object value', () => {
    const result = ok({ a: 1 });
    expect(result).toEqual({ ok: true, value: { a: 1 } });
  });

  it('works with null value', () => {
    const result = ok(null);
    expect(result).toEqual({ ok: true, value: null });
  });

  it('returns type Ok<T>', () => {
    const result = ok(42);
    expectTypeOf(result).toEqualTypeOf<Ok<number>>();
  });
});

describe('err()', () => {
  it('returns { ok: false, error }', () => {
    const result = err('boom');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('boom');
  });

  it('works with object error', () => {
    const result = err({ kind: 'unknown', message: 'oops' });
    expect(result).toEqual({ ok: false, error: { kind: 'unknown', message: 'oops' } });
  });

  it('returns type Err<E>', () => {
    const result = err('boom');
    expectTypeOf(result).toEqualTypeOf<Err<string>>();
  });
});

describe('isOk()', () => {
  it('returns true for ok result', () => {
    const result: Result<number> = ok(1);
    expect(isOk(result)).toBe(true);
  });

  it('returns false for err result', () => {
    const result: Result<number> = err({ kind: 'unknown' as const, message: 'fail' });
    expect(isOk(result)).toBe(false);
  });

  it('narrows type to Ok<T> in truthy branch', () => {
    const result: Result<number> = ok(1);
    if (isOk(result)) {
      expectTypeOf(result).toEqualTypeOf<Ok<number>>();
      expectTypeOf(result.value).toEqualTypeOf<number>();
    }
  });
});

describe('isErr()', () => {
  it('returns true for err result', () => {
    const result: Result<number> = err({ kind: 'unknown' as const, message: 'fail' });
    expect(isErr(result)).toBe(true);
  });

  it('returns false for ok result', () => {
    const result: Result<number> = ok(1);
    expect(isErr(result)).toBe(false);
  });

  it('narrows type to Err<E> in truthy branch', () => {
    const result: Result<number> = err({ kind: 'unknown' as const, message: 'fail' });
    if (isErr(result)) {
      // result is narrowed to Err<DbError>; verify ok is false and error is accessible
      expectTypeOf(result.ok).toEqualTypeOf<false>();
      expect(result.error.kind).toBe('unknown');
    }
  });
});

describe('Result discriminated union', () => {
  it('ok branch allows accessing value', () => {
    // Use explicit union type to allow runtime branching
    const result: Ok<string> | Err<{ kind: 'unknown'; message: string }> = ok('data');
    expect(result.ok).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe('data');
    }
  });

  it('err branch allows accessing error', () => {
    const result: Ok<string> | Err<{ kind: 'unknown'; message: string }> = err({
      kind: 'unknown' as const,
      message: 'nope',
    });
    expect(result.ok).toBe(false);
    if (isErr(result)) {
      expect(result.error.kind).toBe('unknown');
    }
  });
});

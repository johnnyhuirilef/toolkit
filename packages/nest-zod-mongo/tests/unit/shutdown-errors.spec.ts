import { describe, expect, it } from 'vitest';

import { unknownError } from '../../src/shutdown/errors';

describe('unknownError', () => {
  it('builds a DbError with kind: unknown and the given message', () => {
    const result = unknownError('Max retries exceeded');

    expect(result).toEqual({ kind: 'unknown', message: 'Max retries exceeded' });
  });

  it('carries no cause', () => {
    const result = unknownError('No wrapper found for token: primary');

    expect(result.cause).toBeUndefined();
  });
});

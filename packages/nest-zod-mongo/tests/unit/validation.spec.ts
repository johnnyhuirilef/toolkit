import { describe, it, expect } from 'vitest';

import { MongoConfigurationError } from '../../src/zod-mongo.errors';
import { ensureConnectionName } from '../../src/zod-mongo.validation';

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

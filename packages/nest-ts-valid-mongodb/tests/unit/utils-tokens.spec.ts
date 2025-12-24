import { describe, it, expect } from 'vitest';
import { getTsValidMongoDbFactory } from '../../src/lib/core/utils';
import { getModelToken, getConnectionToken } from '../../src/lib/core/tokens';
import { DEFAULT_CONNECTION_NAME } from '../../src/lib/constants';

describe('getTsValidMongoDbFactory', () => {
  it('should return TsValidMongoDb class directly when imported as ESM', () => {
    const factory = getTsValidMongoDbFactory();

    expect(factory).toBeDefined();
    expect(typeof factory).toBe('function');
  });

  it('should handle CJS/ESM interop gracefully', () => {
    // This test verifies the function handles both module formats
    const factory = getTsValidMongoDbFactory();

    // Should have the static methods
    expect(factory.create).toBeDefined();
    expect(factory.createWithClient).toBeDefined();
  });
});

describe('getModelToken', () => {
  it('should generate correct token for a model name', () => {
    const token = getModelToken('users');

    expect(token).toBe('usersModel');
  });

  it('should handle different model names', () => {
    expect(getModelToken('products')).toBe('productsModel');
    expect(getModelToken('orders')).toBe('ordersModel');
    expect(getModelToken('cats')).toBe('catsModel');
  });

  it('should generate unique tokens for different models', () => {
    const token1 = getModelToken('users');
    const token2 = getModelToken('products');

    expect(token1).not.toBe(token2);
  });

  it('should be consistent across multiple calls', () => {
    const token1 = getModelToken('users');
    const token2 = getModelToken('users');

    expect(token1).toBe(token2);
  });
});

describe('getConnectionToken', () => {
  it('should return DEFAULT_CONNECTION_NAME when no name provided', () => {
    const token = getConnectionToken();

    expect(token).toBe(DEFAULT_CONNECTION_NAME);
  });

  it('should return DEFAULT_CONNECTION_NAME when explicitly passed', () => {
    const token = getConnectionToken(DEFAULT_CONNECTION_NAME);

    expect(token).toBe(DEFAULT_CONNECTION_NAME);
  });

  it('should return custom connection name when provided', () => {
    const token = getConnectionToken('analytics');

    expect(token).toBe('analytics');
  });

  it('should handle symbol as connection name', () => {
    const customSymbol = Symbol('custom-connection');
    const token = getConnectionToken(customSymbol);

    expect(token).toBe(customSymbol);
  });

  it('should differentiate between default and custom connections', () => {
    const defaultToken = getConnectionToken();
    const customToken = getConnectionToken('custom');

    expect(defaultToken).not.toBe(customToken);
  });
});

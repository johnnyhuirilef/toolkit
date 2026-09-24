import { describe, it, expect } from 'vitest';

import {
  getConnectionToken,
  getClientWrapperToken,
  getRepositoryToken,
  DEFAULT_CONNECTION_NAME,
} from '../../src/zod-mongo.tokens';

describe('getConnectionToken', () => {
  it('resolves the default connection identically across all three spellings', () => {
    const withoutName = getConnectionToken();
    const withLiteral = getConnectionToken('default');
    const withConstant = getConnectionToken(DEFAULT_CONNECTION_NAME);

    expect(withoutName).toBe(withLiteral);
    expect(withLiteral).toBe(withConstant);
  });

  it('never returns the raw connection name', () => {
    expect(getConnectionToken('orders')).not.toBe('orders');
  });
});

describe('getClientWrapperToken', () => {
  it('resolves the default connection identically across all three spellings', () => {
    const withoutName = getClientWrapperToken();
    const withLiteral = getClientWrapperToken('default');
    const withConstant = getClientWrapperToken(DEFAULT_CONNECTION_NAME);

    expect(withoutName).toBe(withLiteral);
    expect(withLiteral).toBe(withConstant);
  });

  it('never returns the raw connection name', () => {
    expect(getClientWrapperToken('orders')).not.toBe('orders');
  });
});

describe('getRepositoryToken', () => {
  it('resolves the default connection identically across all three spellings', () => {
    const withoutName = getRepositoryToken('User');
    const withLiteral = getRepositoryToken('User', 'default');
    const withConstant = getRepositoryToken('User', DEFAULT_CONNECTION_NAME);

    expect(withoutName).toBe(withLiteral);
    expect(withLiteral).toBe(withConstant);
  });

  it('never returns the raw connection name in place of a namespaced token', () => {
    const namedToken = getRepositoryToken('User', 'orders');

    expect(namedToken).not.toBe('orders');
    expect(namedToken).not.toBe(getRepositoryToken('User'));
  });
});

describe('connection token kinds', () => {
  it('same connection name produces distinct tokens across kinds', () => {
    const connectionToken = getConnectionToken('orders');
    const clientWrapperToken = getClientWrapperToken('orders');
    const repositoryToken = getRepositoryToken('User', 'orders');

    expect(new Set([connectionToken, clientWrapperToken, repositoryToken]).size).toBe(3);
  });
});

import { describe, it, expect } from 'vitest';

import {
  getRepositoryToken,
  getConnectionToken,
  DEFAULT_CONNECTION,
} from '../../src/zod-mongo.tokens';

describe('getRepositoryToken', () => {
  it('returns deterministic token for same inputs', () => {
    const a = getRepositoryToken('users');
    const b = getRepositoryToken('users');
    expect(a).toBe(b);
  });

  it('returns default token without connectionName', () => {
    expect(getRepositoryToken('users')).toBe('usersRepository');
  });

  it('returns default token when connectionName is DEFAULT_CONNECTION', () => {
    expect(getRepositoryToken('users', DEFAULT_CONNECTION)).toBe('usersRepository');
  });

  it('returns named token when connectionName is a string', () => {
    expect(getRepositoryToken('users', 'analytics')).toBe('analytics_usersRepository');
  });

  it('returns named token deterministically', () => {
    const a = getRepositoryToken('users', 'primary');
    const b = getRepositoryToken('users', 'primary');
    expect(a).toBe(b);
  });
});

describe('getConnectionToken', () => {
  it('returns DEFAULT_CONNECTION symbol when no name provided', () => {
    expect(getConnectionToken()).toBe(DEFAULT_CONNECTION);
  });

  it('returns DEFAULT_CONNECTION symbol when DEFAULT_CONNECTION passed', () => {
    expect(getConnectionToken(DEFAULT_CONNECTION)).toBe(DEFAULT_CONNECTION);
  });

  it('returns the connectionName string verbatim when named', () => {
    expect(getConnectionToken('analytics')).toBe('analytics');
  });

  it('is deterministic for same inputs', () => {
    const a = getConnectionToken('primary');
    const b = getConnectionToken('primary');
    expect(a).toBe(b);
  });
});

describe('DEFAULT_CONNECTION', () => {
  it('is a symbol', () => {
    expect(typeof DEFAULT_CONNECTION).toBe('symbol');
  });

  it('is stable (same reference across imports)', () => {
    expect(DEFAULT_CONNECTION).toBe(DEFAULT_CONNECTION);
  });
});

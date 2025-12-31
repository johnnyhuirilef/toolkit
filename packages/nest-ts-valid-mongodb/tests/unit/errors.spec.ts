import { describe, it, expect } from 'vitest';

import {
  TsValidMongoError,
  TsValidMongoConnectionError,
  TsValidMongoConfigurationError,
} from '../../src/lib/errors';

describe('TsValidMongoError', () => {
  it('should create an error with message', () => {
    const error = new TsValidMongoError('Test error message');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TsValidMongoError);
    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('TsValidMongoError');
  });

  it('should include cause when provided', () => {
    const originalError = new Error('Original error');
    const error = new TsValidMongoError('Wrapped error', { cause: originalError });

    // Cast to access cause (ES2022 feature)
    expect((error as Error & { cause?: unknown }).cause).toBe(originalError);
  });

  it('should have proper stack trace', () => {
    const error = new TsValidMongoError('Test error');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('TsValidMongoError');
  });
});

describe('TsValidMongoConnectionError', () => {
  it('should create a connection error', () => {
    const error = new TsValidMongoConnectionError('Connection failed');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TsValidMongoError);
    expect(error).toBeInstanceOf(TsValidMongoConnectionError);
    expect(error.message).toBe('Connection failed');
    expect(error.name).toBe('TsValidMongoConnectionError');
  });

  it('should preserve cause chain', () => {
    const mongoError = new Error('ECONNREFUSED');
    const error = new TsValidMongoConnectionError('Failed to connect to database "mydb"', {
      cause: mongoError,
    });

    expect((error as Error & { cause?: unknown }).cause).toBe(mongoError);
    expect(error.message).toContain('mydb');
  });

  it('should be catchable as TsValidMongoError', () => {
    try {
      throw new TsValidMongoConnectionError('Connection failed');
    } catch (error) {
      expect(error).toBeInstanceOf(TsValidMongoError);
      expect(error).toBeInstanceOf(TsValidMongoConnectionError);
    }
  });
});

describe('TsValidMongoConfigurationError', () => {
  it('should create a configuration error', () => {
    const error = new TsValidMongoConfigurationError('Invalid configuration');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(TsValidMongoError);
    expect(error).toBeInstanceOf(TsValidMongoConfigurationError);
    expect(error.message).toBe('Invalid configuration');
    expect(error.name).toBe('TsValidMongoConfigurationError');
  });

  it('should handle missing required options', () => {
    const error = new TsValidMongoConfigurationError(
      'TsValidMongoModule requires either "mongoClient" or "uri" to be provided.',
    );

    expect(error.message).toContain('mongoClient');
    expect(error.message).toContain('uri');
  });

  it('should be distinguishable from connection errors', () => {
    const configError = new TsValidMongoConfigurationError('Config error');
    const connectionError = new TsValidMongoConnectionError('Connection error');

    expect(configError).not.toBeInstanceOf(TsValidMongoConnectionError);
    expect(connectionError).not.toBeInstanceOf(TsValidMongoConfigurationError);
  });
});

describe('Error instanceof checks', () => {
  it('should allow catching specific error types', () => {
    const errors = [
      new TsValidMongoError('Base error'),
      new TsValidMongoConnectionError('Connection error'),
      new TsValidMongoConfigurationError('Config error'),
    ];

    for (const error of errors) {
      expect(error).toBeInstanceOf(TsValidMongoError);
    }

    expect(errors[1]).toBeInstanceOf(TsValidMongoConnectionError);
    expect(errors[2]).toBeInstanceOf(TsValidMongoConfigurationError);
  });
});

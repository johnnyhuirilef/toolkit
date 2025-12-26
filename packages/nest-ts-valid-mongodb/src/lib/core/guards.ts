import type { MongoDbClientWrapper } from './client';

/**
 * Type guard to validate if a value is a valid MongoDbClientWrapper.
 *
 * Uses early returns and clause guards for low cyclomatic complexity.
 * Each validation check returns immediately on failure.
 *
 * @param value - The value to validate
 * @returns True if value is a valid MongoDbClientWrapper
 *
 * @example
 * ```typescript
 * const wrapper = moduleRef.get(token);
 * if (isValidConnectionWrapper(wrapper)) {
 *   await wrapper.close();
 * }
 * ```
 */
export const isValidConnectionWrapper = (value: unknown): value is MongoDbClientWrapper => {
  if (value === null) {
    return false;
  }

  if (value === undefined) {
    return false;
  }

  if (typeof value !== 'object') {
    return false;
  }

  if (!('close' in value)) {
    return false;
  }

  if (typeof value.close !== 'function') {
    return false;
  }

  if (!('client' in value)) {
    return false;
  }

  return true;
};

/**
 * Type guard to validate if a value is a valid connection token.
 *
 * Connection tokens must be either string or symbol types.
 *
 * @param token - The token to validate
 * @returns True if token is string or symbol
 *
 * @example
 * ```typescript
 * if (isConnectionToken(token)) {
 *   console.log('Valid token:', String(token));
 * }
 * ```
 */
export const isConnectionToken = (token: unknown): token is string | symbol => {
  if (typeof token === 'string') {
    return true;
  }

  if (typeof token === 'symbol') {
    return true;
  }

  return false;
};

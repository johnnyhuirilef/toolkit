import type { ModuleRef } from '@nestjs/core';
import type { MongoDbClientWrapper } from '../client';
import { isValidConnectionWrapper } from '../guards';
import { withTimeout } from './timeout';
import { withRetry } from './retry';
import { logConnectionClosed, logConnectionFailed } from './logger';

/**
 * Configuration for closing a single connection.
 */
type CloseConnectionConfig = {
  readonly token: string | symbol;
  readonly moduleRef: ModuleRef;
  readonly timeoutMs: number;
  readonly retryAttempts: number;
};

/**
 * Result of attempting to close a connection.
 */
type CloseResult = {
  readonly token: string | symbol;
  readonly success: boolean;
  readonly durationMs: number;
  readonly error?: Error;
};

/**
 * Retrieves and validates a connection wrapper from the module.
 *
 * Uses early return pattern for clean error handling.
 * Returns null if wrapper is invalid or not found.
 *
 * @param token - Connection token to retrieve
 * @param moduleRef - NestJS module reference for DI
 * @returns Valid wrapper or null
 */
const getWrapper = (
  token: string | symbol,
  moduleRef: ModuleRef
): MongoDbClientWrapper | null => {
  try {
    const wrapper = moduleRef.get<MongoDbClientWrapper>(token);

    if (!isValidConnectionWrapper(wrapper)) {
      return null;
    }

    return wrapper;
  } catch {
    return null;
  }
};

/**
 * Closes a connection with retry logic.
 *
 * Delegates to withRetry utility for exponential backoff.
 * Returns functional result object instead of throwing.
 *
 * @param wrapper - Connection wrapper to close
 * @param retryAttempts - Maximum retry attempts
 * @returns Result indicating success or failure
 */
const closeWithRetry = async (
  wrapper: MongoDbClientWrapper,
  retryAttempts: number
): Promise<{ success: boolean; error?: Error }> => {
  const result = await withRetry(() => wrapper.close(), {
    maxAttempts: retryAttempts,
    delayMs: 100,
    operation: 'connection.close',
  });

  return {
    success: result.success,
    error: result.error,
  };
};

/**
 * Closes a single MongoDB connection with timeout and retry.
 *
 * Orchestrates the complete close flow:
 * 1. Validates wrapper exists
 * 2. Applies retry logic
 * 3. Enforces timeout
 * 4. Logs outcome
 *
 * Uses declarative composition of utilities.
 * Early returns for invalid states.
 *
 * @param config - Configuration for connection close
 * @returns Result with success status and metadata
 *
 * @example
 * ```typescript
 * const result = await closeConnection({
 *   token: 'primary-db',
 *   moduleRef,
 *   timeoutMs: 5000,
 *   retryAttempts: 2,
 * });
 *
 * if (result.success) {
 *   console.log('Closed in', result.durationMs, 'ms');
 * }
 * ```
 */
export const closeConnection = async (
  config: CloseConnectionConfig
): Promise<CloseResult> => {
  const { token, moduleRef, timeoutMs, retryAttempts } = config;
  const startTime = Date.now();
  const tokenString = String(token);

  const wrapper = getWrapper(token, moduleRef);

  if (wrapper === null) {
    return {
      token,
      success: false,
      durationMs: 0,
      error: new Error('Invalid or missing wrapper'),
    };
  }

  try {
    const closeOperation = closeWithRetry(wrapper, retryAttempts);
    const result = await withTimeout(closeOperation, {
      timeoutMs,
      operation: `close connection ${tokenString}`,
    });

    const durationMs = Date.now() - startTime;

    if (result.success) {
      logConnectionClosed(tokenString, durationMs);
      return { token, success: true, durationMs };
    }

    logConnectionFailed({
      token: tokenString,
      error: result.error?.message,
      stack: result.error?.stack,
    });

    return {
      token,
      success: false,
      durationMs,
      error: result.error,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorObj = error instanceof Error ? error : new Error(String(error));

    logConnectionFailed({
      token: tokenString,
      duration: durationMs,
      error: errorObj.message,
      stack: errorObj.stack,
    });

    return {
      token,
      success: false,
      durationMs,
      error: errorObj,
    };
  }
};

/**
 * Closes multiple connections in parallel.
 *
 * Uses Promise.all for concurrent execution.
 * Each connection close is independent and isolated.
 *
 * @param tokens - Array of connection tokens to close
 * @param moduleRef - NestJS module reference
 * @param timeoutMs - Timeout for each connection close
 * @param retryAttempts - Retry attempts for each connection
 * @returns Array of close results in same order as tokens
 *
 * @example
 * ```typescript
 * const results = await closeAllConnections(
 *   ['db1', 'db2', 'db3'],
 *   moduleRef,
 *   10000,
 *   2
 * );
 *
 * const successCount = results.filter(r => r.success).length;
 * ```
 */
export const closeAllConnections = async (
  tokens: (string | symbol)[],
  moduleRef: ModuleRef,
  timeoutMs: number,
  retryAttempts: number
): Promise<CloseResult[]> => {
  const closePromises = tokens.map((token) =>
    closeConnection({
      token,
      moduleRef,
      timeoutMs,
      retryAttempts,
    })
  );

  return Promise.all(closePromises);
};

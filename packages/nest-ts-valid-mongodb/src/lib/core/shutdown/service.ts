import type { ModuleRef } from '@nestjs/core';
import { closeAllConnections } from './orchestrator';
import {
  logShutdownStart,
  logShutdownComplete,
  logShutdownTimeout,
} from './logger';
import type { ShutdownConfig } from './config';
import { withTimeout, ShutdownTimeoutError } from './timeout';

/**
 * Configuration for the shutdown service.
 */
type ShutdownServiceConfig = {
  readonly tokens: (string | symbol)[];
  readonly moduleRef: ModuleRef;
  readonly shutdownConfig: ShutdownConfig;
};

/**
 * Summary of shutdown execution results.
 */
type ShutdownSummary = {
  readonly totalConnections: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly durationMs: number;
};

/**
 * Counts successful and failed results.
 *
 * Pure function for result aggregation.
 *
 * @param results - Array of close results
 * @returns Counts of successes and failures
 */
const countResults = (
  results: Array<{ success: boolean }>
): { success: number; failure: number } => {
  const success = results.filter((r) => r.success).length;
  const failure = results.length - success;
  return { success, failure };
};

/**
 * Creates an empty shutdown summary.
 *
 * Used for early return when no connections to close.
 *
 * @returns Empty summary with zero values
 */
const createEmptySummary = (): ShutdownSummary => ({
  totalConnections: 0,
  successCount: 0,
  failureCount: 0,
  durationMs: 0,
});

/**
 * Executes graceful shutdown of all MongoDB connections.
 *
 * Orchestrates the complete shutdown flow:
 * 1. Early return if no connections
 * 2. Log shutdown start
 * 3. Close all connections with timeout
 * 4. Log completion with statistics
 * 5. Return summary
 *
 * Uses declarative composition and early returns.
 *
 * @param config - Shutdown service configuration
 * @returns Summary with execution statistics
 *
 * @example
 * ```typescript
 * const summary = await executeShutdown({
 *   tokens: ['db1', 'db2'],
 *   moduleRef,
 *   shutdownConfig: {
 *     timeoutMs: 10000,
 *     retryAttempts: 2,
 *     forceClose: false,
 *   },
 * });
 *
 * console.log(`Closed ${summary.successCount}/${summary.totalConnections}`);
 * ```
 */
export const executeShutdown = async (
  config: ShutdownServiceConfig
): Promise<ShutdownSummary> => {
  const { tokens, moduleRef, shutdownConfig } = config;
  const startTime = Date.now();

  if (tokens.length === 0) {
    return createEmptySummary();
  }

  logShutdownStart(tokens.length);

  try {
    const closeOperation = closeAllConnections(
      tokens,
      moduleRef,
      shutdownConfig.timeoutMs,
      shutdownConfig.retryAttempts
    );

    const results = await withTimeout(closeOperation, {
      timeoutMs: shutdownConfig.timeoutMs,
      operation: 'shutdown',
    });

    const durationMs = Date.now() - startTime;
    const { success, failure } = countResults(results);

    logShutdownComplete(tokens.length, success, failure, durationMs);

    return {
      totalConnections: tokens.length,
      successCount: success,
      failureCount: failure,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    if (error instanceof ShutdownTimeoutError) {
      logShutdownTimeout(shutdownConfig.timeoutMs);
    }

    return {
      totalConnections: tokens.length,
      successCount: 0,
      failureCount: tokens.length,
      durationMs,
    };
  }
};

import { Logger } from '@nestjs/common';
import type { ModuleRef } from '@nestjs/core';

import type { ShutdownConfig } from './utilities';
import { withRetry, withTimeout, isValidConnectionWrapper } from './utilities';
import { SHUTDOWN_EVENTS } from '../../constants/shutdown';
import type { MongoDatabaseClientWrapper } from '../client';

const LOGGER_CONTEXT = 'TsValidMongoModule';

type ConnectionResult = {
  readonly token: string;
  readonly outcome: 'closed' | 'failed';
  readonly durationMs: number;
  readonly error?: string;
};

export type ShutdownSummary = {
  readonly event: string;
  readonly totalConnections: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly durationMs: number;
  readonly connections: readonly ConnectionResult[];
};

const closeOneConnection = async (
  token: string | symbol,
  moduleReference: ModuleRef,
  config: ShutdownConfig,
): Promise<ConnectionResult> => {
  const tokenString = String(token);
  const start = Date.now();

  try {
    const wrapper = moduleReference.get<MongoDatabaseClientWrapper>(token);

    if (!isValidConnectionWrapper(wrapper)) {
      throw new Error(`Invalid or missing connection wrapper for token: ${tokenString}`);
    }

    await withTimeout(
      withRetry(() => wrapper.close(config.forceClose), config.retryAttempts),
      config.timeoutMs,
      `close ${tokenString}`,
    );

    return { token: tokenString, outcome: 'closed', durationMs: Date.now() - start };
  } catch (error) {
    return {
      token: tokenString,
      outcome: 'failed',
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const EMPTY_SUMMARY: ShutdownSummary = {
  event: SHUTDOWN_EVENTS.SHUTDOWN,
  totalConnections: 0,
  successCount: 0,
  failureCount: 0,
  durationMs: 0,
  connections: [],
};

export const executeShutdown = async (
  tokens: readonly (string | symbol)[],
  moduleReference: ModuleRef,
  config: ShutdownConfig,
): Promise<ShutdownSummary> => {
  if (tokens.length === 0) return EMPTY_SUMMARY;

  const start = Date.now();

  const connections = await Promise.all(
    tokens.map((token) => closeOneConnection(token, moduleReference, config)),
  );

  const summary: ShutdownSummary = {
    event: SHUTDOWN_EVENTS.SHUTDOWN,
    totalConnections: tokens.length,
    successCount: connections.filter((c) => c.outcome === 'closed').length,
    failureCount: connections.filter((c) => c.outcome === 'failed').length,
    durationMs: Date.now() - start,
    connections,
  };

  const message = JSON.stringify({ ...summary, timestamp: new Date().toISOString() }, null, 2);

  if (summary.failureCount > 0) {
    Logger.error(message, LOGGER_CONTEXT);
    return summary;
  }

  Logger.log(message, LOGGER_CONTEXT);
  return summary;
};

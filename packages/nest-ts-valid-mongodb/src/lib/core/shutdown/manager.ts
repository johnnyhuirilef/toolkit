import { Logger } from '@nestjs/common';
import type { ModuleRef } from '@nestjs/core';

import type { ShutdownConfig } from './utilities';
import {
  withRetry,
  withTimeout,
  isValidConnectionWrapper,
  ShutdownTimeoutError,
} from './utilities';
import { SHUTDOWN_EVENTS } from '../../constants/shutdown';
import type { MongoDatabaseClientWrapper } from '../client';

const LOGGER_CONTEXT = 'TsValidMongoModule';

type ShutdownSummary = {
  readonly totalConnections: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly durationMs: number;
};

// --- LOGGING HELPERS ---

const logEvent = (event: string, data: Record<string, unknown>) => {
  Logger.log(
    JSON.stringify({ event, ...data, timestamp: new Date().toISOString() }, null, 2),
    LOGGER_CONTEXT,
  );
};

const logError = (event: string, data: Record<string, unknown>) => {
  Logger.error(
    JSON.stringify({ event, ...data, timestamp: new Date().toISOString() }, null, 2),
    LOGGER_CONTEXT,
  );
};

// --- CORE LOGIC ---

const closeOneConnection = async (
  token: string | symbol,
  moduleReference: ModuleRef,
  config: ShutdownConfig,
): Promise<boolean> => {
  const tokenString = String(token);
  const start = Date.now();

  try {
    const wrapper = moduleReference.get<MongoDatabaseClientWrapper>(token);

    if (!isValidConnectionWrapper(wrapper)) {
      throw new Error('Invalid or missing wrapper');
    }

    const closeOp = async () => {
      await wrapper.close(config.forceClose);
    };

    const retryOp = () => withRetry(closeOp, config.retryAttempts);

    await withTimeout(retryOp(), config.timeoutMs, `close ${tokenString}`);

    logEvent(SHUTDOWN_EVENTS.CONNECTION_CLOSED, {
      token: tokenString,
      durationMs: Date.now() - start,
    });

    return true;
  } catch (error) {
    const errorObject = error instanceof Error ? error : new Error(String(error));
    logError(SHUTDOWN_EVENTS.CONNECTION_FAILED, {
      token: tokenString,
      error: errorObject.message,
      stack: errorObject.stack,
      durationMs: Date.now() - start,
    });
    return false;
  }
};

export const executeShutdown = async (
  tokens: (string | symbol)[],
  moduleReference: ModuleRef,
  config: ShutdownConfig,
): Promise<ShutdownSummary> => {
  const start = Date.now();

  if (tokens.length === 0) {
    return { totalConnections: 0, successCount: 0, failureCount: 0, durationMs: 0 };
  }

  logEvent(SHUTDOWN_EVENTS.START, { connectionCount: tokens.length });

  try {
    // We wrap the whole batch in a global timeout safety net as well,
    // though individual timeouts should handle it.
    // Ideally, we trust individual timeouts.

    const results = await Promise.all(
      tokens.map((token) => closeOneConnection(token, moduleReference, config)),
    );

    const successCount = results.filter(Boolean).length;
    const failureCount = tokens.length - successCount;
    const durationMs = Date.now() - start;

    logEvent(SHUTDOWN_EVENTS.COMPLETE, {
      totalConnections: tokens.length,
      successCount,
      failureCount,
      durationMs,
    });

    return { totalConnections: tokens.length, successCount, failureCount, durationMs };
  } catch (error) {
    const durationMs = Date.now() - start;
    if (error instanceof ShutdownTimeoutError) {
      logError(SHUTDOWN_EVENTS.TIMEOUT, { timeoutMs: config.timeoutMs });
    }

    // In case of catastrophic failure (shouldn't happen with Promise.all and catching inside map)
    return {
      totalConnections: tokens.length,
      successCount: 0,
      failureCount: tokens.length,
      durationMs,
    };
  }
};

import type { ModuleRef } from '@nestjs/core';
import type { Result } from '@wenu/mongo';
import { err, isOk, isErr, toDbError } from '@wenu/mongo';
import { isNullish, tryit } from 'radashi';

import type { MongoClientWrapper } from '../zod-mongo.interfaces';
import type { ShutdownConfig } from './config';
import { unknownError } from './errors';
import { withRetry } from './retry';
import { withTimeout } from './timeout';

export type ShutdownSummary = {
  readonly total: number;
  readonly closed: number;
  readonly failed: number;
  readonly durationMs: number;
  readonly results: readonly Result<null>[];
};

// ponytail: bridges Result<null> into a throwing op so withRetry can retry on Err
const unwrapOrThrow = (result: Result<null>): void => {
  if (isErr(result)) throw new Error(result.error.message);
};

const closeOne = async (
  token: string,
  reference: ModuleRef,
  config: ShutdownConfig,
): Promise<Result<null>> => {
  const [resolveError, wrapper] = await tryit(() =>
    Promise.resolve(reference.get<MongoClientWrapper>(token, { strict: false })),
  )();
  if (!isNullish(resolveError) || isNullish(wrapper))
    return err(unknownError(`No wrapper found for token: ${token}`));
  const closeOp = (): Promise<null> =>
    wrapper.close(config.forceClose).then((result) => {
      unwrapOrThrow(result);
      return null;
    });
  const [timeoutError, retryResult] = await tryit(() =>
    withTimeout(withRetry(closeOp, config.retryAttempts), config.timeoutMs, `close ${token}`),
  )();
  if (!isNullish(timeoutError)) return err(toDbError(timeoutError));
  return retryResult ?? err(unknownError('Unexpected empty result'));
};

export const shutdownAll = async (
  tokens: readonly string[],
  reference: ModuleRef,
  config: ShutdownConfig,
): Promise<ShutdownSummary> => {
  const start = Date.now();
  const results = await Promise.all(tokens.map((token) => closeOne(token, reference, config)));
  return {
    total: tokens.length,
    closed: results.filter((r) => isOk(r)).length,
    failed: results.filter((r) => isErr(r)).length,
    durationMs: Date.now() - start,
    results,
  };
};

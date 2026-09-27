import type { Result } from '@wenu/mongo';
import { err, isErr, toDbError } from '@wenu/mongo';
import { isNullish, tryit } from 'radashi';

import type { MongoClientWrapper } from '../zod-mongo.interfaces';
import type { ShutdownConfig } from './config';
import { unknownError } from './errors';
import { withRetry } from './retry';
import { withTimeout } from './timeout';

// ponytail: bridges Result<null> into a throwing op so withRetry can retry on Err
const unwrapOrThrow = (result: Result<null>): void => {
  if (isErr(result)) throw new Error(result.error.message);
};

export const closeConnection = async (
  wrapper: Pick<MongoClientWrapper, 'close'>,
  config: ShutdownConfig,
  label: string,
): Promise<Result<null>> => {
  const closeOp = (): Promise<null> =>
    wrapper.close(config.forceClose).then((result) => {
      unwrapOrThrow(result);
      return null;
    });
  const [timeoutError, retryResult] = await tryit(() =>
    withTimeout(withRetry(closeOp, config.retryAttempts), config.timeoutMs, label),
  )();
  if (!isNullish(timeoutError)) return err(toDbError(timeoutError));
  return retryResult ?? err(unknownError('Unexpected empty result'));
};

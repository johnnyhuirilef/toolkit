import type { Result } from '@ioni/zod-mongo';
import { ok, err, toDbError } from '@ioni/zod-mongo';
import { tryit } from 'radashi';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const retryLoop = <T>(
  operation: () => Promise<T>,
  attemptsLeft: number,
  baseDelayMs: number,
  attempt: number,
): Promise<Result<T>> => {
  if (attemptsLeft <= 0)
    return Promise.resolve(err({ kind: 'unknown' as const, message: 'Max retries exceeded' }));
  return tryit(operation)().then(([error, value]) => {
    if (error === undefined) return ok(value);
    if (attemptsLeft <= 1) return err(toDbError(error));
    // ponytail: recursive .then() is intentional — avoids mutable state in retry loop
    // eslint-disable-next-line promise/no-nesting
    return delay(baseDelayMs * 2 ** attempt).then(() =>
      retryLoop(operation, attemptsLeft - 1, baseDelayMs, attempt + 1),
    );
  });
};

export const withRetry = <T>(
  operation: () => Promise<T>,
  attempts: number,
  baseDelayMs = 100,
): Promise<Result<T>> => retryLoop(operation, attempts, baseDelayMs, 0);

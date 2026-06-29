import { isNullish, tryit } from 'radashi';

import { toDbError } from './errors.js';
import { err, ok } from './result.js';
import type { Result } from './result.js';

// ponytail: wraps driver promises — tryit returns [error, value] tuple, we map to our Result type
export const runSafe = async <T>(operation: () => Promise<T>): Promise<Result<T>> => {
  const [error, value] = await tryit(operation)();
  return isNullish(error) ? ok(value as T) : err(toDbError(error));
};

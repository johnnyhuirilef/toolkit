import { isError, getErrorMessage } from 'radashi';
import { ZodError } from 'zod';

export type DbErrorKind = 'validation' | 'not-found' | 'duplicate-key' | 'connection' | 'unknown';

export type DbError = {
  readonly kind: DbErrorKind;
  readonly message: string;
  readonly cause?: unknown;
};

const MONGO_DUPLICATE_KEY_CODE = 11_000;

export const toDbError = (error: unknown): DbError => {
  if (error instanceof ZodError)
    return { kind: 'validation', message: getErrorMessage(error), cause: error };
  if (isError(error) && 'code' in error && error.code === MONGO_DUPLICATE_KEY_CODE)
    return { kind: 'duplicate-key', message: getErrorMessage(error), cause: error };
  if (isError(error)) return { kind: 'unknown', message: getErrorMessage(error), cause: error };
  return { kind: 'unknown', message: String(error) };
};

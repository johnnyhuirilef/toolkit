import { MongoNetworkError, MongoServerSelectionError } from 'mongodb';
import { isError, getErrorMessage } from 'radashi';
import { ZodError } from 'zod';

export type DbErrorKind = 'validation' | 'not-found' | 'duplicate-key' | 'connection' | 'unknown';

export type DbError = {
  readonly kind: DbErrorKind;
  readonly message: string;
  readonly cause?: unknown;
};

export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';
}

const MONGO_DUPLICATE_KEY_CODE = 11_000;

export const toDbError = (error: unknown): DbError => {
  if (error instanceof ZodError)
    return { kind: 'validation', message: getErrorMessage(error), cause: error };
  if (error instanceof NotFoundError)
    return { kind: 'not-found', message: getErrorMessage(error), cause: error };
  if (isError(error) && 'code' in error && error.code === MONGO_DUPLICATE_KEY_CODE)
    return { kind: 'duplicate-key', message: getErrorMessage(error), cause: error };
  // MongoNetworkError and MongoServerSelectionError live on separate branches of the
  // MongoError hierarchy (neither extends the other), so both need an explicit check.
  // MongoNetworkTimeoutError extends MongoNetworkError, so the first check covers it too.
  if (error instanceof MongoNetworkError || error instanceof MongoServerSelectionError)
    return { kind: 'connection', message: getErrorMessage(error), cause: error };
  if (isError(error)) return { kind: 'unknown', message: getErrorMessage(error), cause: error };
  return { kind: 'unknown', message: String(error) };
};

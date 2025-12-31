/**
 * Base error class for all TsValidMongo-related errors.
 * Extends the native Error class with additional context.
 */
export class TsValidMongoError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TsValidMongoError';
  }
}

/**
 * Thrown when a MongoDB connection fails to establish.
 *
 * @example
 * ```typescript
 * throw new TsValidMongoConnectionError(
 *   'Failed to connect to database "mydb"',
 *   { cause: originalError }
 * );
 * ```
 */
export class TsValidMongoConnectionError extends TsValidMongoError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TsValidMongoConnectionError';
  }
}

/**
 * Thrown when module configuration is invalid or incomplete.
 *
 * @example
 * ```typescript
 * throw new TsValidMongoConfigurationError(
 *   'Either "uri" or "mongoClient" must be provided'
 * );
 * ```
 */
export class TsValidMongoConfigurationError extends TsValidMongoError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'TsValidMongoConfigurationError';
  }
}

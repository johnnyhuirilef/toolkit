export class ZodMongoConnectionError extends Error {
  override readonly name = 'ZodMongoConnectionError';
}

export class ZodMongoConfigurationError extends Error {
  override readonly name = 'ZodMongoConfigurationError';
}

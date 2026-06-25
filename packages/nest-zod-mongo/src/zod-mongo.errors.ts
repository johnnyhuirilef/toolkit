export class MongoConnectionError extends Error {
  override readonly name = 'MongoConnectionError';
}

export class MongoConfigurationError extends Error {
  override readonly name = 'MongoConfigurationError';
}

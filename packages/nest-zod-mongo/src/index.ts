// Module
export { MongoModule } from './zod-mongo.module';

// Decorators
export { InjectRepository, InjectConnection } from './zod-mongo.decorators';

// Token helpers
export { getRepositoryToken, getConnectionToken, DEFAULT_CONNECTION } from './zod-mongo.tokens';

// Error types
export { MongoConnectionError, MongoConfigurationError } from './zod-mongo.errors';

// Option types
export type { MongoOptions, MongoAsyncOptions, MongoClientWrapper } from './zod-mongo.interfaces';

// Health check (opt-in — requires @nestjs/terminus peer dep)
export { MongoHealthIndicator } from './health/mongo-health.indicator.js';
export { MongoHealthModule } from './health/mongo-health.module.js';

// Re-exports from @wenu/mongo for DX
export type { Repository, CollectionDef, Doc, Result, DbError } from '@wenu/mongo';
export { defineCollection, ok, err, isOk, isErr, NotFoundError } from '@wenu/mongo';

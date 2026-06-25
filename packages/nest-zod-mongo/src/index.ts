// Module
export { ZodMongoModule } from './zod-mongo.module';

// Decorators
export { InjectRepository, InjectConnection } from './zod-mongo.decorators';

// Token helpers
export { getRepositoryToken, getConnectionToken, DEFAULT_CONNECTION } from './zod-mongo.tokens';

// Error types
export { ZodMongoConnectionError, ZodMongoConfigurationError } from './zod-mongo.errors';

// Option types
export type {
  ZodMongoOptions,
  ZodMongoAsyncOptions,
  MongoClientWrapper,
} from './zod-mongo.interfaces';

// Re-exports from @ioni/zod-mongo for DX
export type { Repository, CollectionDef, Doc, Result, DbError } from '@ioni/zod-mongo';
export { defineCollection, ok, err, isOk, isErr } from '@ioni/zod-mongo';

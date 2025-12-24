// Core types and interfaces
export * from './lib/interfaces';
export * from './lib/errors';

// Module and decorators
export * from './lib/core/module';
export * from './lib/decorators';

// Re-export client wrapper type for advanced use cases
export type { MongoDbClientWrapper } from './lib/core/client';

// Utility functions (mostly for internal use, but exported for advanced users)
export * from './lib/core/tokens';

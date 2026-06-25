export const DEFAULT_CONNECTION = Symbol('ZodMongoDefaultConnection');

export const getRepositoryToken = (name: string, connectionName?: string | symbol): string =>
  connectionName === undefined || connectionName === DEFAULT_CONNECTION
    ? `${name}Repository`
    : `${String(connectionName)}_${name}Repository`;

export const getConnectionToken = (connectionName?: string | symbol): string | symbol =>
  connectionName === undefined || connectionName === DEFAULT_CONNECTION
    ? DEFAULT_CONNECTION
    : connectionName;

export const getClientWrapperToken = (connectionName?: string | symbol): string =>
  `ZodMongoClientWrapper_${String(connectionName ?? 'default')}`;

// Internal tokens — not exported from index.ts
export const ZOD_MONGO_CONNECTION_TOKENS = Symbol('ZodMongoConnectionTokens');
export const ZOD_MONGO_MODULE_OPTIONS = Symbol('ZodMongoModuleOptions');

import { ensureConnectionName } from './zod-mongo.validation';

export const DEFAULT_CONNECTION_NAME = 'default';

const TOKEN_NAMESPACE = '@wenu/nest-mongo';

type ConnectionTokenKind = 'connection' | 'client-wrapper' | 'options' | 'repository';

const createConnectionScopedToken = (
  kind: ConnectionTokenKind,
  connectionName: string,
  ...segments: readonly string[]
): string => [TOKEN_NAMESPACE, kind, ensureConnectionName(connectionName), ...segments].join('/');

export const getConnectionToken = (connectionName: string = DEFAULT_CONNECTION_NAME): string =>
  createConnectionScopedToken('connection', connectionName);

export const getClientWrapperToken = (connectionName: string = DEFAULT_CONNECTION_NAME): string =>
  createConnectionScopedToken('client-wrapper', connectionName);

export const getRepositoryToken = (
  collectionName: string,
  connectionName: string = DEFAULT_CONNECTION_NAME,
): string => createConnectionScopedToken('repository', connectionName, collectionName);

// Internal — resolves a registration's options for `forFeature` repository providers.
// Not exported from index.ts.
export const getOptionsToken = (connectionName: string = DEFAULT_CONNECTION_NAME): string =>
  createConnectionScopedToken('options', connectionName);

// Internal — core-module-local tokens (never connection-scoped, safe because each
// MongoCoreModule resolves its own providers before looking at imports, see design F7).
export const MONGO_CORE_OPTIONS = '@wenu/nest-mongo/core/options';
export const MONGO_CORE_CONNECTION = '@wenu/nest-mongo/core/connection';
export const MONGO_CORE_ID = '@wenu/nest-mongo/core/id';

// Internal — kept for the current single-connection shutdown/provider wiring.
// Replaced by MONGO_CORE_* wiring in a later task of this change.
export const ZOD_MONGO_CONNECTION_TOKENS = Symbol('MongoConnectionTokens');
export const ZOD_MONGO_MODULE_OPTIONS = Symbol('MongoModuleOptions');

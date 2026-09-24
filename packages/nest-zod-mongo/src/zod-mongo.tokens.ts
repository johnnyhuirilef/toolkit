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

// Internal — core-module-local tokens. They need no connection scope: Nest resolves a module's
// own providers before its imports, so each MongoCoreModule registration sees only its own.
export const MONGO_CORE_OPTIONS = '@wenu/nest-mongo/core/options';
export const MONGO_CORE_CONNECTION = '@wenu/nest-mongo/core/connection';
export const MONGO_CORE_ID = '@wenu/nest-mongo/core/id';

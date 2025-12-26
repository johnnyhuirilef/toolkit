/**
 * Default injection token for MongoDB connections.
 *
 * This symbol is used when no custom connection name is provided.
 * Using a Symbol ensures uniqueness and prevents naming collisions.
 *
 * @internal
 */
export const DEFAULT_CONNECTION_NAME = Symbol('TS_VALID_MONGO_DEFAULT_CONNECTION');

/**
 * Injection token for the array of active connection tokens.
 *
 * This is used internally by the module to track all active connections
 * for proper cleanup during shutdown.
 *
 * @internal
 */
export const TS_VALID_MONGO_CONNECTION_TOKENS = 'TS_VALID_MONGO_CONNECTION_TOKENS';

/**
 * Injection token for module configuration options.
 *
 * This is used internally to preserve user-provided options for shutdown
 * configuration and other module-level settings.
 *
 * @internal
 */
export const TS_VALID_MONGO_MODULE_OPTIONS = 'TS_VALID_MONGO_MODULE_OPTIONS';

/**
 * Re-export shutdown constants for convenient access.
 */
export { SHUTDOWN_DEFAULTS, SHUTDOWN_EVENTS } from './shutdown';

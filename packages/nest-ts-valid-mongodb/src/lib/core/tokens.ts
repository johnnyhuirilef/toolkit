import { DEFAULT_CONNECTION_NAME } from '../constants';

/**
 * Generates the dependency injection token for a MongoDB model (collection).
 *
 * This function is used internally by `forFeature()` and `InjectModel()` to ensure
 * consistent token generation.
 *
 * @param modelName - The name of the collection
 * @returns The injection token string
 *
 * @example
 * ```typescript
 * getModelToken('users') // Returns: 'usersModel'
 * getModelToken('products') // Returns: 'productsModel'
 * ```
 *
 * @internal
 */
export function getModelToken(modelName: string): string {
  return `${modelName}Model`;
}

/**
 * Generates the dependency injection token for a MongoDB connection.
 *
 * This function is used internally by `forRoot()`, `forRootAsync()`, and `InjectConnection()`
 * to ensure consistent token generation for connections.
 *
 * @param name - Optional custom connection name
 * @returns The injection token (string or symbol)
 *
 * @example
 * ```typescript
 * getConnectionToken() // Returns: DEFAULT_CONNECTION_NAME symbol
 * getConnectionToken('analytics') // Returns: 'analytics'
 * ```
 *
 * @internal
 */
export function getConnectionToken(name?: string | symbol): string | symbol {
  return name && name !== DEFAULT_CONNECTION_NAME ? name : DEFAULT_CONNECTION_NAME;
}

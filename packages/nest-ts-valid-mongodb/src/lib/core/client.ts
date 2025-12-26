import type { MongoClient } from 'mongodb';
import TsValidMongoDb from 'ts-valid-mongodb';

import { getTsValidMongoDbFactory } from './utils';

/**
 * Wrapper object that contains a TsValidMongoDb instance and a close function.
 *
 * This type is used internally to manage MongoDB connections throughout the module lifecycle.
 *
 * @internal
 */
export type MongoDbClientWrapper = {
  /** The TsValidMongoDb instance for creating models and accessing the database */
  client: TsValidMongoDb;
  /**
   * Function to close the MongoDB connection.
   *
   * @param force - Whether to force close the connection (drops pending operations)
   */
  close: (force?: boolean) => Promise<void>;
};

/**
 * Creates a MongoDB client instance wrapped with TsValidMongoDb functionality.
 *
 * This factory function is agnostic of how the native MongoClient was created,
 * allowing flexibility in connection management.
 *
 * @param options - Configuration containing the native client and database name
 * @param options.client - An already instantiated MongoClient
 * @param options.databaseName - The name of the database to use
 * @returns A wrapped client with connection management
 *
 * @example
 * ```typescript
 * import { MongoClient } from 'mongodb';
 *
 * const nativeClient = new MongoClient('mongodb://localhost:27017');
 * await nativeClient.connect();
 *
 * const wrapper = createTsValidMongoDb({
 *   client: nativeClient,
 *   databaseName: 'my_app',
 * });
 *
 * // Use the wrapper
 * const usersModel = wrapper.client.createModel(userSchema);
 *
 * // Clean up
 * await wrapper.close();
 * ```
 *
 * @internal
 */
export function createTsValidMongoDb(options: {
  client: MongoClient;
  databaseName: string;
}): MongoDbClientWrapper {
  const { databaseName, client } = options;

  const TsValidMongoDbClass = getTsValidMongoDbFactory();

  // Wrap the native client with TsValidMongoDb
  const tsValidMongoClient = TsValidMongoDbClass.createWithClient(client, databaseName);

  return {
    client: tsValidMongoClient,
    close: async (force?: boolean) => {
      // We delegate the closing to the native client
      await client.close(force);
    },
  };
}

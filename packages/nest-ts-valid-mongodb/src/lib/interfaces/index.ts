import type { ModuleMetadata, InjectionToken } from '@nestjs/common';
import type { IndexDescription, MongoClient, MongoClientOptions, IndexDirection } from 'mongodb';
import type { ZodSchema } from 'zod';

/**
 * Re-exported types from ts-valid-mongodb for better developer experience.
 *
 * @example
 * ```typescript
 * import { Model, Doc } from '@ioni/nest-ts-valid-mongodb';
 * import { z } from 'zod';
 *
 * const UserSchema = z.object({ name: z.string() });
 * type User = z.infer<typeof UserSchema>;
 *
 * // Model provides typed CRUD operations
 * const model: Model<User> = ...;
 *
 * // Doc adds _id and __v to your type
 * const document: Doc<User> = await model.findById('...');
 * console.log(document._id); // ObjectId
 * ```
 */
export type { Model, Doc } from 'ts-valid-mongodb';

/**
 * Definition for a MongoDB Index, fully compatible with the native driver.
 * This type aligns with the specific structure expected by ts-valid-mongodb's Schema constructor.
 *
 * @example
 * ```typescript
 * const indexes: MongoIndexDefinition[] = [
 *   { key: { email: 1 }, unique: true },
 *   { key: { createdAt: -1 }, expireAfterSeconds: 3600 },
 * ];
 * ```
 */
export type MongoIndexDefinition = IndexDescription & {
  key: Partial<Record<string, IndexDirection>>;
};

/**
 * Configuration options for graceful shutdown behavior.
 *
 * Controls how the module closes MongoDB connections when the application shuts down.
 *
 * @example
 * ```typescript
 * const shutdownOptions: ShutdownOptions = {
 *   timeout: 10000,    // Wait max 10 seconds
 *   forceClose: false, // Allow graceful close
 * };
 * ```
 */
export type ShutdownOptions = {
  /**
   * Maximum time in milliseconds to wait for all connections to close gracefully.
   * After this timeout, the shutdown process will complete regardless of connection state.
   *
   * @default 10000 (10 seconds)
   */
  readonly timeout: number;

  /**
   * Whether to force close connections immediately without waiting.
   * When true, skips graceful shutdown and closes connections forcefully.
   *
   * @default false
   */
  readonly forceClose: boolean;
};

/**
 * Base options for the MongoDB Connection.
 * @internal
 */
type TsValidMongoConnectionOptionsBase = {
  /**
   * Unique name for the connection. Useful if connecting to multiple databases.
   * Defaults to a standard symbol if not provided.
   *
   * @example
   * ```typescript
   * // Single database (default)
   * { databaseName: 'app_db' }
   *
   * // Multiple databases
   * { connectionName: 'primary', databaseName: 'app_db' }
   * { connectionName: 'analytics', databaseName: 'analytics_db' }
   * ```
   */
  connectionName?: string | symbol;

  /**
   * The name of the database to connect to.
   */
  databaseName: string;

  /**
   * Maximum time in milliseconds to wait for graceful shutdown.
   * After this timeout, connections will be forcefully closed.
   *
   * @default 10000 (10 seconds)
   *
   * @example
   * ```typescript
   * TsValidMongoModule.forRoot({
   *   uri: 'mongodb://localhost:27017',
   *   databaseName: 'my_db',
   *   shutdownTimeout: 15000, // Wait 15 seconds max
   * })
   * ```
   */
  readonly shutdownTimeout?: number;

  /**
   * Whether to force immediate shutdown without waiting for graceful close.
   * Use with caution - may interrupt in-flight operations.
   *
   * @default false
   *
   * @example
   * ```typescript
   * TsValidMongoModule.forRoot({
   *   uri: 'mongodb://localhost:27017',
   *   databaseName: 'my_db',
   *   forceShutdown: true, // For serverless/lambda
   * })
   * ```
   */
  readonly forceShutdown?: boolean;
};

/**
 * Option A: Provide an already instantiated native MongoClient.
 *
 * Use this when you need fine-grained control over the MongoClient creation,
 * or when sharing a client across multiple modules.
 *
 * @example
 * ```typescript
 * import { MongoClient } from 'mongodb';
 *
 * const client = new MongoClient('mongodb://localhost:27017', {
 *   maxPoolSize: 50,
 *   retryWrites: true,
 * });
 *
 * TsValidMongoModule.forRoot({
 *   mongoClient: client,
 *   databaseName: 'my_db',
 * });
 * ```
 */
export type TsValidMongoConnectionOptionsWithClient = {
  /** An already instantiated and connected MongoClient */
  mongoClient: MongoClient;
  /** Must not be provided when using mongoClient */
  uri?: never;
  /** Must not be provided when using mongoClient */
  clientOptions?: never;
} & TsValidMongoConnectionOptionsBase;

/**
 * Option B: Provide a URI and let the module create the client.
 *
 * This is the most common approach. The module will handle client creation and connection.
 *
 * @example
 * ```typescript
 * TsValidMongoModule.forRoot({
 *   uri: 'mongodb://localhost:27017',
 *   databaseName: 'my_db',
 *   clientOptions: {
 *     retryWrites: true,
 *     maxPoolSize: 10,
 *   },
 * });
 * ```
 */
export type TsValidMongoConnectionOptionsWithUri = {
  /** MongoDB connection URI (e.g., 'mongodb://localhost:27017') */
  uri: string;
  /** Optional MongoDB client configuration */
  clientOptions?: MongoClientOptions;
  /** Must not be provided when using uri */
  mongoClient?: never;
} & TsValidMongoConnectionOptionsBase;

/**
 * Options for configuring a MongoDB connection.
 *
 * This discriminated union enforces that you provide **either** a URI **or** a MongoClient,
 * but not both. TypeScript will prevent invalid configurations at compile time.
 *
 * @see {@link TsValidMongoConnectionOptionsWithUri} for URI-based configuration
 * @see {@link TsValidMongoConnectionOptionsWithClient} for client-based configuration
 */
export type TsValidMongoConnectionOptions =
  | TsValidMongoConnectionOptionsWithClient
  | TsValidMongoConnectionOptionsWithUri;

/**
 * Async options for configuring the module using factory pattern.
 *
 * This is the recommended approach for production environments where configuration
 * comes from environment variables, ConfigService, or other dynamic sources.
 *
 * @example
 * ```typescript
 * import { ConfigService } from '@nestjs/config';
 *
 * TsValidMongoModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: async (config: ConfigService) => ({
 *     uri: config.get<string>('MONGO_URI')!,
 *     databaseName: config.get<string>('MONGO_DB_NAME')!,
 *     clientOptions: {
 *       retryWrites: true,
 *       maxPoolSize: config.get<number>('MONGO_POOL_SIZE') ?? 10,
 *     },
 *   }),
 *   inject: [ConfigService],
 * });
 * ```
 */
export type TsValidMongoModuleAsyncOptions = {
  /** Optional connection name for multi-database setups */
  connectionName?: string | symbol;
  /**
   * Factory function that returns connection options.
   * Can be async or sync.
   */
  useFactory: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => Promise<TsValidMongoConnectionOptions> | TsValidMongoConnectionOptions;
  /** Dependencies to inject into the factory function */
  inject?: InjectionToken[];
} & Pick<ModuleMetadata, 'imports'>;

/**
 * Definition for a MongoDB collection with Zod schema validation.
 *
 * Each collection registered with `forFeature()` will be available for injection
 * via the `@InjectModel()` decorator.
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 *
 * const UserSchema = z.object({
 *   name: z.string().min(1),
 *   email: z.string().email(),
 *   age: z.number().min(0).optional(),
 * });
 *
 * TsValidMongoModule.forFeature([
 *   {
 *     name: 'users',
 *     schema: UserSchema,
 *     indexes: [
 *       { key: { email: 1 }, unique: true },
 *       { key: { name: 1 } },
 *     ],
 *     versionKey: true, // Adds __v field for optimistic locking
 *   },
 * ]);
 * ```
 */
export type TsValidMongoCollectionDefinition = {
  /**
   * The name of the collection in MongoDB.
   * This is used for both the database collection name and the injection token.
   */
  name: string;

  /**
   * Zod schema for runtime validation and TypeScript type inference.
   * All insert/update operations will be validated against this schema.
   */
  schema: ZodSchema;

  /**
   * Custom injection token for the model.
   * If not provided, defaults to `${name}Model` (e.g., 'usersModel').
   *
   * @example
   * ```typescript
   * // Custom token
   * { name: 'users', schema: UserSchema, provide: 'CUSTOM_USER_MODEL' }
   *
   * // Inject with custom token
   * \@InjectModel('CUSTOM_USER_MODEL') private usersModel: Model<User>
   * ```
   */
  provide?: string | symbol;

  /**
   * MongoDB indexes to create on the collection.
   * These will be created automatically when the model is initialized.
   *
   * @example
   * ```typescript
   * indexes: [
   *   { key: { email: 1 }, unique: true },
   *   { key: { createdAt: -1 } },
   *   { key: { name: 'text' } }, // Text index
   * ]
   * ```
   */
  indexes?: MongoIndexDefinition[];

  /**
   * Whether to include the `__v` version key field.
   * Useful for optimistic locking and detecting concurrent modifications.
   *
   * @default true
   */
  versionKey?: boolean;
};

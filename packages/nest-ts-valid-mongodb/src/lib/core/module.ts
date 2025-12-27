import {
  DynamicModule,
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
  Provider,
  Optional,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import TsValidMongoDb, { Schema } from 'ts-valid-mongodb';

import { createTsValidMongoDb, MongoDbClientWrapper } from './client';
import { getTsValidMongoDbFactory } from './utils';
import { getModelToken } from './tokens';
import {
  DEFAULT_CONNECTION_NAME,
  TS_VALID_MONGO_CONNECTION_TOKENS,
  TS_VALID_MONGO_MODULE_OPTIONS,
} from '../constants';
import {
  TsValidMongoCollectionDefinition,
  TsValidMongoConnectionOptions,
  TsValidMongoModuleAsyncOptions,
} from '../interfaces';
import { TsValidMongoConnectionError, TsValidMongoConfigurationError } from '../errors';
import { executeShutdown } from './shutdown/manager';
import { resolveShutdownConfig } from './shutdown/utils';

/**
 * Main module for integrating MongoDB with NestJS using the native driver and Zod validation.
 *
 * This module is marked as `@Global()`, meaning all providers are automatically available
 * across your entire application without needing to re-import the module.
 *
 * @example
 * ```typescript
 * // Basic usage in AppModule
 * \@Module({
 *   imports: [
 *     TsValidMongoModule.forRoot({
 *       uri: 'mongodb://localhost:27017',
 *       databaseName: 'my_db',
 *     }),
 *     TsValidMongoModule.forFeature([
 *       { name: 'users', schema: UserSchema }
 *     ]),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class TsValidMongoModule implements OnApplicationShutdown {
  constructor(
    private readonly moduleRef: ModuleRef,
    @Optional()
    @Inject(TS_VALID_MONGO_CONNECTION_TOKENS)
    private readonly connectionTokens: (string | symbol)[],
    @Optional()
    @Inject(TS_VALID_MONGO_MODULE_OPTIONS)
    private readonly moduleOptions?: TsValidMongoConnectionOptions,
  ) {}

  /**
   * Lifecycle hook: Closes all open MongoDB connections when the application shuts down.
   *
   * This hook is called during application shutdown, after all modules have been destroyed.
   * Using OnApplicationShutdown instead of OnModuleDestroy ensures that database connections
   * remain available for other modules during their cleanup phase.
   *
   * @param signal - Optional shutdown signal (SIGTERM, SIGINT, etc.)
   */
  async onApplicationShutdown(signal?: string) {
    if (!this.connectionTokens) {
      return;
    }

    const shutdownConfig = resolveShutdownConfig(this.moduleOptions);
    await executeShutdown(this.connectionTokens, this.moduleRef, shutdownConfig);
  }

  /**
   * Configures the TsValidMongoModule synchronously.
   *
   * Use this when you have static configuration values (e.g., hardcoded URIs for local development).
   * For production environments, prefer {@link forRootAsync} with ConfigService.
   *
   * @param options - Connection configuration options
   * @returns A configured DynamicModule ready to be imported
   *
   * @example
   * ```typescript
   * // Using a connection URI
   * TsValidMongoModule.forRoot({
   *   uri: 'mongodb://localhost:27017',
   *   databaseName: 'my_database',
   * })
   *
   * // Using an existing MongoClient instance
   * const client = new MongoClient('mongodb://localhost:27017');
   * TsValidMongoModule.forRoot({
   *   mongoClient: client,
   *   databaseName: 'my_database',
   * })
   * ```
   */
  static forRoot(options: TsValidMongoConnectionOptions): DynamicModule {
    const connectionToken = options.connectionName ?? DEFAULT_CONNECTION_NAME;

    const connectionProvider: Provider = {
      provide: connectionToken,
      useFactory: async () => {
        return await this.createConnectionWrapper(options);
      },
    };

    return {
      module: TsValidMongoModule,
      providers: [
        connectionProvider,
        {
          provide: TS_VALID_MONGO_CONNECTION_TOKENS,
          useValue: [connectionToken],
        },
        {
          provide: TS_VALID_MONGO_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [connectionProvider],
    };
  }

  /**
   * Configures the TsValidMongoModule asynchronously.
   *
   * This is the recommended approach for production environments where configuration
   * comes from environment variables, ConfigService, or other async sources.
   *
   * @param options - Async configuration options with factory function
   * @returns A configured DynamicModule ready to be imported
   *
   * @example
   * ```typescript
   * // Using ConfigService for environment-based configuration
   * TsValidMongoModule.forRootAsync({
   *   imports: [ConfigModule],
   *   useFactory: async (configService: ConfigService) => ({
   *     uri: configService.get<string>('MONGO_URI'),
   *     databaseName: configService.get<string>('MONGO_DB_NAME'),
   *   }),
   *   inject: [ConfigService],
   * })
   * ```
   */
  static forRootAsync(options: TsValidMongoModuleAsyncOptions): DynamicModule {
    const connectionToken = options.connectionName ?? DEFAULT_CONNECTION_NAME;

    const connectionProvider: Provider = {
      provide: connectionToken,
      useFactory: async (...args: unknown[]) => {
        const config = await options.useFactory(...args);
        return await this.createConnectionWrapper(config);
      },
      inject: options.inject ?? [],
    };

    const optionsProvider: Provider = {
      provide: TS_VALID_MONGO_MODULE_OPTIONS,
      useFactory: async (...args: unknown[]) => {
        return await options.useFactory(...args);
      },
      inject: options.inject ?? [],
    };

    return {
      module: TsValidMongoModule,
      imports: options.imports ?? [],
      providers: [
        connectionProvider,
        optionsProvider,
        {
          provide: TS_VALID_MONGO_CONNECTION_TOKENS,
          useValue: [connectionToken],
        },
      ],
      exports: [connectionProvider],
    };
  }

  /**
   * Registers MongoDB collections (models) for dependency injection.
   *
   * Each collection is validated against its Zod schema at runtime, ensuring type safety
   * and data integrity. The resulting models are injectable via the `@InjectModel()` decorator.
   *
   * @param collections - Array of collection definitions with Zod schemas
   * @param connectionName - Optional connection name if using multiple databases
   * @returns A configured DynamicModule with model providers
   *
   * @example
   * ```typescript
   * // Define your Zod schema
   * const UserSchema = z.object({
   *   name: z.string(),
   *   email: z.string().email(),
   *   age: z.number().min(0),
   * });
   *
   * // Register the collection
   * TsValidMongoModule.forFeature([
   *   {
   *     name: 'users',
   *     schema: UserSchema,
   *     indexes: [{ key: { email: 1 }, unique: true }],
   *   },
   * ])
   *
   * // Inject in a service
   * \@Injectable()
   * export class UsersService {
   *   constructor(
   *     \@InjectModel('users') private usersModel: Model<z.infer<typeof UserSchema>>
   *   ) {}
   * }
   * ```
   */
  static forFeature(
    collections: TsValidMongoCollectionDefinition[],
    connectionName?: string | symbol,
  ): DynamicModule {
    const connectionToken = connectionName ?? DEFAULT_CONNECTION_NAME;

    const providers: Provider[] = collections.map((collection) => {
      const provide = collection.provide || getModelToken(collection.name);

      return {
        provide,
        useFactory: (dbWrapper: ReturnType<typeof createTsValidMongoDb>) => {
          Logger.log(`📄 Creating model: '${collection.name}'`, 'TsValidMongoModule');

          // We access the internal client from the wrapper
          return dbWrapper.client.createModel(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            new Schema(collection.name, collection.schema as any, {
              versionKey: collection.versionKey ?? true,
              indexes: collection.indexes,
            }),
          );
        },
        inject: [connectionToken], // Injects the Wrapper
      };
    });

    return {
      module: TsValidMongoModule,
      providers: providers,
      exports: providers,
    };
  }

  /**
   * Internal helper to create and establish a MongoDB connection.
   *
   * @param options - Connection configuration
   * @returns A wrapped MongoDB client with connection management
   * @throws {TsValidMongoConfigurationError} When neither uri nor mongoClient is provided
   * @throws {TsValidMongoConnectionError} When connection establishment fails
   * @private
   */
  private static async createConnectionWrapper(
    options: TsValidMongoConnectionOptions,
  ): Promise<MongoDbClientWrapper> {
    Logger.log(
      `🔌 Preparing MongoDB connection for database: ${options.databaseName}`,
      'TsValidMongoModule',
    );

    let dbInstance: TsValidMongoDb;
    const TsValidMongoDbClass = getTsValidMongoDbFactory();

    if (options.uri) {
      dbInstance = TsValidMongoDbClass.create(
        options.uri,
        options.databaseName,
        options.clientOptions,
      );
    } else if (options.mongoClient) {
      dbInstance = TsValidMongoDbClass.createWithClient(options.mongoClient, options.databaseName);
    } else {
      throw new TsValidMongoConfigurationError(
        'TsValidMongoModule requires either "mongoClient" or "uri" to be provided.',
      );
    }

    try {
      // .connect() returns the native MongoClient!
      const nativeClient = await dbInstance.connect();
      Logger.log(`✅ MongoDB Connected to ${options.databaseName}`, 'TsValidMongoModule');

      // Return the wrapper with the instance and the close method using the native client we just got
      return {
        client: dbInstance,
        close: async (force?: boolean) => {
          // Use provided force parameter, fallback to options, then default to false
          const shouldForce = force ?? (options.forceShutdown ?? false);
          await nativeClient.close(shouldForce);
        },
      };
    } catch (error) {
      const errorMessage = `Failed to connect to MongoDB database: "${options.databaseName}"`;
      Logger.error(`❌ ${errorMessage}`, 'TsValidMongoModule');
      throw new TsValidMongoConnectionError(errorMessage, { cause: error });
    }
  }
}

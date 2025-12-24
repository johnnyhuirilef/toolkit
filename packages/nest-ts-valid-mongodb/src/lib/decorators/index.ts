import { Inject } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '../core/tokens';

/**
 * Parameter decorator that injects a MongoDB collection model with Zod validation.
 *
 * The injected model is fully typed and provides type-safe CRUD operations based on
 * the Zod schema registered with `forFeature()`.
 *
 * @param modelName - The name of the collection (must match the name used in `forFeature()`)
 * @returns A parameter decorator for dependency injection
 *
 * @example
 * ```typescript
 * import { Injectable } from '@nestjs/common';
 * import { InjectModel, Model } from '@ioni/nest-ts-valid-mongodb';
 * import { z } from 'zod';
 *
 * const UserSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 *
 * type User = z.infer<typeof UserSchema>;
 *
 * \@Injectable()
 * export class UsersService {
 *   constructor(
 *     \@InjectModel('users') private readonly usersModel: Model<User>
 *   ) {}
 *
 *   async create(user: User) {
 *     return this.usersModel.insert(user);
 *   }
 *
 *   async findAll() {
 *     return this.usersModel.find();
 *   }
 * }
 * ```
 *
 * @see {@link Model} for available model methods
 * @public
 */
export const InjectModel = (modelName: string) => Inject(getModelToken(modelName));

/**
 * Parameter decorator that injects the MongoDB connection wrapper.
 *
 * Use this when you need direct access to the database instance for advanced operations
 * like transactions, admin commands, or creating models dynamically.
 *
 * @param connectionName - Optional connection name for multi-database setups
 * @returns A parameter decorator for dependency injection
 *
 * @example
 * ```typescript
 * import { Injectable } from '@nestjs/common';
 * import { InjectConnection } from '@ioni/nest-ts-valid-mongodb';
 *
 * \@Injectable()
 * export class DatabaseService {
 *   constructor(
 *     \@InjectConnection() private readonly dbWrapper: any
 *   ) {}
 *
 *   async getStats() {
 *     const db = this.dbWrapper.client.getDb();
 *     return db.stats();
 *   }
 *
 *   async createIndexManually() {
 *     const db = this.dbWrapper.client.getDb();
 *     return db.collection('users').createIndex({ email: 1 }, { unique: true });
 *   }
 * }
 * ```
 *
 * @public
 */
export const InjectConnection = (connectionName?: string) =>
  Inject(getConnectionToken(connectionName));

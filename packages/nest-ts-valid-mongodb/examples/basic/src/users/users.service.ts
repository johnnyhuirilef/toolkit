import { Injectable } from '@nestjs/common';
import { InjectModel, Model, Doc } from '@ioni/nest-ts-valid-mongodb';
import { User } from '../user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel('users') private readonly usersModel: Model<User>) {}

  /**
   * Create a new user
   * The user object will be validated against the Zod schema before insertion
   */
  async create(user: User): Promise<Doc<User>> {
    return this.usersModel.insert(user);
  }

  /**
   * Find all users
   */
  async findAll(): Promise<Doc<User>[]> {
    return this.usersModel.find();
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<Doc<User> | null> {
    return this.usersModel.findOneBy({ email });
  }

  /**
   * Update user's age
   */
  async updateAge(id: string, age: number): Promise<Doc<User> | null> {
    return this.usersModel.updateById(id, {
      values: { age },
    });
  }

  /**
   * Delete a user by ID
   */
  async delete(id: string): Promise<Doc<User> | null> {
    return this.usersModel.deleteById(id);
  }

  /**
   * Count total users
   */
  async count(): Promise<number> {
    return this.usersModel.count();
  }
}

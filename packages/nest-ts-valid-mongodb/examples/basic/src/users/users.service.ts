import { InjectModel, Model } from '@ioni/nest-ts-valid-mongodb';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

import { User } from '../schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel('users') private readonly usersModel: Model<User>) {}

  async create(user: User) {
    return this.usersModel.insert(user);
  }

  async findAll() {
    return this.usersModel.find({});
  }

  async findOne(id: string) {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid ID format: ${id}`);
    }

    const user = await this.usersModel.findById(new ObjectId(id));

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async delete(id: string) {
    if (!ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid ID format: ${id}`);
    }

    // deleteOneBy returns the deleted document or null
    const deletedUser = await this.usersModel.deleteOneBy({
      _id: new ObjectId(id),
    });

    if (!deletedUser) {
      throw new NotFoundException(`User with ID ${id} not found for deletion`);
    }

    return deletedUser;
  }
}

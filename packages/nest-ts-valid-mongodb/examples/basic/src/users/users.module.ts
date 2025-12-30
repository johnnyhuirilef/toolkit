import { TsValidMongoModule } from '@ioni/nest-ts-valid-mongodb';
import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    TsValidMongoModule.forFeature([
      {
        name: 'users',
        schema: UserSchema,
        indexes: [{ key: { email: 1 }, unique: true }],
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

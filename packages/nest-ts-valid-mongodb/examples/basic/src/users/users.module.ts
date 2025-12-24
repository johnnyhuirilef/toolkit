import { Module } from '@nestjs/common';
import { TsValidMongoModule } from '@ioni/nest-ts-valid-mongodb';
import { UserSchema } from '../user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    TsValidMongoModule.forFeature([
      {
        name: 'users',
        schema: UserSchema,
        // Create a unique index on email
        indexes: [{ key: { email: 1 }, unique: true }],
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

import { TsValidMongoModule } from '@ioni/nest-ts-valid-mongodb';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TsValidMongoModule.forRoot({
      uri: 'mongodb://localhost:27017',
      databaseName: 'nest-example',
    }),
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

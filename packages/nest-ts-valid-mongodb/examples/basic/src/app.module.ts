import { Module } from '@nestjs/common';
import { TsValidMongoModule } from '@ioni/nest-ts-valid-mongodb';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Basic synchronous configuration
    // In production, use forRootAsync with ConfigService
    TsValidMongoModule.forRoot({
      uri: process.env.MONGO_URI || 'mongodb://localhost:27017?directConnection=true',
      databaseName: process.env.MONGO_DB_NAME || 'basic_example',
      // Optional: Configure graceful shutdown behavior
      // shutdownTimeout: 10000,  // Default: 10 seconds
      // forceShutdown: false,    // Default: false (graceful close)
    }),
    UsersModule,
  ],
})
export class AppModule {}

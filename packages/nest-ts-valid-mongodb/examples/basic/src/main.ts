import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for development
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📘 API Endpoints:`);
  console.log(`   POST   /users          - Create user`);
  console.log(`   GET    /users          - Get all users`);
  console.log(`   GET    /users/count    - Count users`);
  console.log(`   GET    /users/:email   - Get user by email`);
  console.log(`   PUT    /users/:id/age  - Update user age`);
  console.log(`   DELETE /users/:id      - Delete user`);
}

bootstrap();

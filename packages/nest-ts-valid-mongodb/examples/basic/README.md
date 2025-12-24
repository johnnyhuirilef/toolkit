# Basic Example - Quick Start

A minimal, working example showing how to get started with `@ioni/nest-ts-valid-mongodb`.

## 📦 What's Included

- ✅ Basic module setup with `forRoot()`
- ✅ Zod schema definition
- ✅ Model injection with `@InjectModel()`
- ✅ CRUD operations (Create, Read, Update, Delete)
- ✅ REST API with controllers
- ✅ Type-safe MongoDB operations

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Create a `.env` file:

```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=basic_example
PORT=3000
```

### 3. Start MongoDB (if not running)

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or use your local MongoDB installation
```

### 4. Run the Application

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## 📖 Code Walkthrough

### 1. Define Your Schema (`user.schema.ts`)

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

export type User = z.infer<typeof UserSchema>;
```

### 2. Register the Module (`app.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { TsValidMongoModule } from '@ioni/nest-ts-valid-mongodb';
import { UserSchema } from './user.schema';

@Module({
  imports: [
    TsValidMongoModule.forRoot({
      uri: 'mongodb://localhost:27017',
      databaseName: 'basic_example',
    }),
    TsValidMongoModule.forFeature([{ name: 'users', schema: UserSchema }]),
  ],
})
export class AppModule {}
```

### 3. Create a Service (`users.service.ts`)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel, Model, Doc } from '@ioni/nest-ts-valid-mongodb';
import { User } from './user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel('users') private usersModel: Model<User>) {}

  async create(user: User): Promise<Doc<User>> {
    return this.usersModel.insert(user);
  }

  async findAll(): Promise<Doc<User>[]> {
    return this.usersModel.find();
  }

  async findByEmail(email: string): Promise<Doc<User> | null> {
    return this.usersModel.findOneBy({ email });
  }

  async delete(id: string): Promise<Doc<User> | null> {
    return this.usersModel.deleteById(id);
  }
}
```

## 🧪 Test the API

Once running, test with curl or your favorite HTTP client:

### Create a User

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com", "age": 25}'
```

### Get All Users

```bash
curl http://localhost:3000/users
```

### Find by Email

```bash
curl http://localhost:3000/users/john@example.com
```

### Delete a User

```bash
curl -X DELETE http://localhost:3000/users/{user_id}
```

## 📚 What You Learned

- ✅ How to configure `TsValidMongoModule`
- ✅ How to define type-safe schemas with Zod
- ✅ How to inject models into services
- ✅ How to perform CRUD operations
- ✅ How types are automatically inferred from schemas

## 🎯 Next Steps

Ready for more? Check out the [Advanced Example](../advanced/) to learn about:

- Async configuration with ConfigService
- Multiple database connections
- Error handling
- Transactions
- Testing strategies

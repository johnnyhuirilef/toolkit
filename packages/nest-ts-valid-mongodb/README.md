# @ioni/nest-ts-valid-mongodb

[![NPM Version](https://img.shields.io/npm/v/@ioni/nest-ts-valid-mongodb)](https://www.npmjs.com/package/@ioni/nest-ts-valid-mongodb)
[![License](https://img.shields.io/npm/l/@ioni/nest-ts-valid-mongodb)](LICENSE)
[![Node.js Version](https://img.shields.io/node/v/@ioni/nest-ts-valid-mongodb)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10%20%7C%2011-red.svg)](https://nestjs.com/)

> **Architect's Choice:** High-performance MongoDB Native Driver wrapper for NestJS with Zod schema
> validation. Lightweight, type-safe, and robust.

## 🧠 Motivation

Let's be real: **Mongoose is heavy**. It adds a massive layer of abstraction, hydration, and state
management that you often don't need for high-performance microservices.

On the other hand, using the **Native MongoDB Driver** directly is like running with scissors—fast,
but one typo in your query or schema and you're in trouble.

**@ioni/nest-ts-valid-mongodb** bridges this gap. It provides:

1.  **Native Speed**: Zero-overhead wrapper around the official MongoDB driver.
2.  **Zod Safety**: Runtime validation using Zod schemas. If it doesn't match the schema, it doesn't
    get saved.
3.  **NestJS Ergonomics**: Proper Dependency Injection, Modules, and Decorators.

## ✨ Features

- 🚀 **Lightweight**: ~8KB bundle size. No bloat.
- 🛡️ **Zod Powered**: Define schemas with Zod, get TypeScript inference for free.
- 💉 **Dependency Injection**: `forRoot`, `forRootAsync` (ConfigService), and `forFeature`.
- 🔌 **Robust**: Auto-reconnect patterns and clean shutdown handling.
- 🎨 **Decorators**: `@InjectModel()` and `@InjectConnection()` for clean code.

## 📦 Installation

```bash
pnpm add @ioni/nest-ts-valid-mongodb mongodb zod @nestjs/common @nestjs/core
# or
npm install @ioni/nest-ts-valid-mongodb mongodb zod @nestjs/common @nestjs/core
```

> **Note for Local Development:** If you are using a local MongoDB instance (especially with Docker
> or ReplSets), you might need to append `?directConnection=true` to your connection string to avoid
> connection timeouts.

### Requirements

- **Node.js**: >= 16.0.0
- **NestJS**: ^10.0.0 || ^11.0.0
- **MongoDB**: ^5.0.0 || ^6.0.0
- **TypeScript**: >= 5.0.0
- **Zod**: ^3.0.0

## 🏗️ Complete Example

Here's a full working example showing all the pieces together:

```typescript
// user.schema.ts
import { z } from 'zod';

export const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18),
  role: z.enum(['user', 'admin']).default('user'),
});

export type User = z.infer<typeof UserSchema>;

// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TsValidMongoModule } from '@ioni/nest-ts-valid-mongodb';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TsValidMongoModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI')!,
        databaseName: config.get<string>('MONGO_DB_NAME')!,
      }),
      inject: [ConfigService],
    }),
    UsersModule,
  ],
})
export class AppModule {}

// users/users.module.ts
import { Module } from '@nestjs/common';
import { TsValidMongoModule } from '@ioni/nest-ts-valid-mongodb';
import { UserSchema } from '../user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

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
  exports: [UsersService],
})
export class UsersModule {}

// users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel, Model, Doc } from '@ioni/nest-ts-valid-mongodb';
import { User } from '../user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel('users') private readonly usersModel: Model<User>) {}

  async create(user: User): Promise<Doc<User>> {
    return this.usersModel.insert(user);
  }

  async findAll(): Promise<Doc<User>[]> {
    return this.usersModel.find();
  }

  async findByEmail(email: string): Promise<Doc<User> | null> {
    return this.usersModel.findOneBy({ email });
  }

  async updateRole(id: string, role: 'user' | 'admin'): Promise<Doc<User> | null> {
    return this.usersModel.updateById(id, { values: { role } });
  }

  async delete(id: string): Promise<Doc<User> | null> {
    return this.usersModel.deleteById(id);
  }
}

// users/users.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../user.schema';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() user: User) {
    return this.usersService.create(user);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':email')
  findOne(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Put(':id/role')
  updateRole(@Param('id') id: string, @Body('role') role: 'user' | 'admin') {
    return this.usersService.updateRole(id, role);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
```

## 🚀 Quick Start

### 1. Define your Schema

Create a Zod schema. This acts as both your runtime validator and your TypeScript type source.

```typescript
// cats.schema.ts
import { z } from 'zod';

export const CatSchema = z.object({
  name: z.string(),
  age: z.number().min(0),
  breed: z.string().optional(),
});

export type Cat = z.infer<typeof CatSchema>;
```

### 2. Import the Module

Register the module in your `AppModule`.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TsValidMongoModule } from '@ioni/nest-ts-valid-mongodb';
import { CatSchema } from './cats.schema';

@Module({
  imports: [
    // Synchronous configuration
    TsValidMongoModule.forRoot({
      uri: 'mongodb://localhost:27017',
      databaseName: 'test_db',
    }),

    // Register specific collections (features)
    TsValidMongoModule.forFeature([{ name: 'cats', schema: CatSchema }]),
  ],
})
export class AppModule {}
```

### 3. Inject and Use

Use the `@InjectModel` decorator to get your **fully typed** model.

```typescript
// cats.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel, Model } from '@ioni/nest-ts-valid-mongodb';
import { Cat, CatSchema } from './cats.schema';

@Injectable()
export class CatsService {
  constructor(@InjectModel('cats') private readonly catModel: Model<Cat>) {}

  async create(cat: Cat) {
    // This will throw if 'cat' doesn't match the Zod schema!
    return await this.catModel.insert(cat);
  }

  async findAll() {
    return await this.catModel.find({});
  }

  async findByName(name: string) {
    return await this.catModel.findOneBy({ name });
  }

  async updateAge(id: string, age: number) {
    return await this.catModel.updateById(id, {
      values: { age },
    });
  }

  async delete(id: string) {
    return await this.catModel.deleteById(id);
  }
}
```

## 📘 API Reference

### Model Methods

The injected `Model<T>` provides the following type-safe methods:

#### Query Methods

- **`find(filters?, options?)`** - Find multiple documents
- **`findOneBy(filters?, options?)`** - Find a single document
- **`findById(id, options?)`** - Find by ObjectId or string ID
- **`count(filters?, options?)`** - Count documents matching filters
- **`advancedFind(config, outputSchema?, options?)`** - Advanced queries with cursor manipulation

#### Insert Methods

- **`insert(document, options?)`** - Insert a single document (validates with Zod)
- **`insertMany(documents, options?)`** - Insert multiple documents

#### Update Methods

- **`updateById(id, { values, mode? }, options?)`** - Update by ID
- **`updateOneBy({ values, mode? }, filters, options?)`** - Update first matching document
- **`updateMany({ values, mode? }, filters?, options?)`** - Update multiple documents

The `mode` parameter supports:

- `'basic'` (default): Partial updates with type safety
- `'advanced'`: Full MongoDB update operators (`$set`, `$inc`, etc.)

#### Delete Methods

- **`delete(filters?, options?)`** - Delete multiple documents
- **`deleteOneBy(filters, options?)`** - Delete first matching document
- **`deleteById(id, options?)`** - Delete by ID

### Type Utilities

```typescript
import { Model, Doc } from '@ioni/nest-ts-valid-mongodb';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>; // { name: string; email: string }
type UserDoc = Doc<User>; // User & { _id: ObjectId; __v?: number }
type UserModel = Model<User>; // Typed model with all CRUD methods
```

## ⚙️ Advanced Configuration

### Async Configuration (ConfigService)

Usually, you don't hardcode credentials. Use `forRootAsync`:

```typescript
TsValidMongoModule.forRootAsync({
  useFactory: async (configService: ConfigService) => ({
    uri: configService.get<string>('MONGO_URI'),
    databaseName: configService.get<string>('MONGO_DB_NAME'),
  }),
  inject: [ConfigService],
});
```

### Accessing the Native Connection

Sometimes you need raw access to the connection (e.g., for transactions or admin operations).

```typescript
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@ioni/nest-ts-valid-mongodb';
import type { MongoDbClientWrapper } from '@ioni/nest-ts-valid-mongodb';

@Injectable()
export class DatabaseService {
  constructor(@InjectConnection() private readonly dbWrapper: MongoDbClientWrapper) {}

  async getStats() {
    const db = this.dbWrapper.client.getDb();
    return await db.stats();
  }

  async createIndex() {
    const db = this.dbWrapper.client.getDb();
    return await db.collection('users').createIndex({ email: 1 }, { unique: true });
  }

  async runTransaction(operations: () => Promise<void>) {
    const session = await this.dbWrapper.client.getDb().client.startSession();
    try {
      await session.withTransaction(operations);
    } finally {
      await session.endSession();
    }
  }
}
```

## 🛡️ Error Handling

The library provides custom error classes for better error management:

### Error Types

```typescript
import {
  TsValidMongoError,
  TsValidMongoConnectionError,
  TsValidMongoConfigurationError,
} from '@ioni/nest-ts-valid-mongodb';
```

- **`TsValidMongoError`** - Base error class for all library errors
- **`TsValidMongoConnectionError`** - Thrown when connection fails
- **`TsValidMongoConfigurationError`** - Thrown when configuration is invalid

### Example: Handling Errors

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection, TsValidMongoConnectionError } from '@ioni/nest-ts-valid-mongodb';

@Injectable()
export class HealthService implements OnModuleInit {
  constructor(@InjectConnection() private dbWrapper: any) {}

  async onModuleInit() {
    try {
      const db = this.dbWrapper.client.getDb();
      await db.command({ ping: 1 });
      console.log('✅ Database connection healthy');
    } catch (error) {
      if (error instanceof TsValidMongoConnectionError) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Cause:', error.cause);
      }
      throw error;
    }
  }
}
```

## 🤝 Contributing

We hate bad code. If you want to contribute, ensure:

1.  **Strict Types**: No `any` (unless you have a damn good reason).
2.  **Tests**: Unit tests are mandatory.
3.  **Linting**: Respect the eslint rules.

## 🐛 Feedback & Support

This is an actively maintained project. We welcome feedback, bug reports, and feature requests:

- 🐛 [Report a Bug](https://github.com/ioni-org/nest-ts-valid-mongodb/issues/new?labels=bug)
- 💡
  [Request a Feature](https://github.com/ioni-org/nest-ts-valid-mongodb/issues/new?labels=enhancement)
- 💬 [Start a Discussion](https://github.com/ioni-org/nest-ts-valid-mongodb/discussions)
- 📧 [Contact Maintainer](https://github.com/ioni-org)

## 📈 Roadmap

- [ ] Comprehensive test suite with 80%+ coverage
- [ ] Migration guide from Mongoose
- [ ] Performance benchmarks vs Mongoose
- [ ] Support for MongoDB change streams
- [ ] Advanced aggregation pipeline helpers
- [ ] Schema migration utilities

## 📚 Related Projects

- [ts-valid-mongodb](https://github.com/eljou/ts-valid-mongodb) - The underlying MongoDB wrapper
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation
- [NestJS](https://nestjs.com/) - Progressive Node.js framework

## 🙏 Acknowledgments

This library is a robust NestJS wrapper for
[ts-valid-mongodb](https://www.npmjs.com/package/ts-valid-mongodb). We stand on the shoulders of
giants—special thanks to the original authors for creating such a lightweight and type-safe
foundation for MongoDB interactions.

## 📄 License

MIT © Ioni

See [LICENSE](./LICENSE) for full details.

---

<div align="center">
  <sub>Built with ❤️ for developers who value performance AND safety</sub>
</div>

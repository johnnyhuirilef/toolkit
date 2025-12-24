# Advanced Example - Production-Ready Patterns

A comprehensive example demonstrating advanced features and production best practices.

## 📦 What's Included

- ✅ Async configuration with `ConfigService`
- ✅ Multiple database connections (app + analytics)
- ✅ Custom error handling
- ✅ Repository pattern
- ✅ Health checks
- ✅ Transaction examples
- ✅ Advanced indexing strategies
- ✅ Docker Compose setup
- ✅ Environment-based configuration

## 🚀 Quick Start

### Option 1: Run Locally

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start MongoDB
docker-compose up -d mongodb

# Run the application
npm run start:dev
```

### Option 2: Run Everything with Docker

```bash
# Start all services (MongoDB + App)
docker-compose up
```

## 🏗️ Architecture

This example demonstrates a clean, scalable architecture:

```
src/
├── config/
│   └── database.config.ts       # Centralized DB configuration
├── users/
│   ├── users.module.ts
│   ├── users.repository.ts      # Repository pattern (data access layer)
│   ├── users.service.ts         # Business logic layer
│   ├── users.controller.ts      # API layer
│   └── user.schema.ts
├── analytics/
│   ├── analytics.module.ts
│   ├── analytics.repository.ts
│   └── analytics.schema.ts
├── health/
│   └── health.controller.ts     # Health check endpoints
└── main.ts
```

## 🎯 Key Concepts

### 1. Multiple Database Connections

```typescript
// Primary database
TsValidMongoModule.forRootAsync({
  connectionName: 'primary',
  useFactory: (config: ConfigService) => ({
    uri: config.get('MONGO_URI'),
    databaseName: config.get('MONGO_DB_NAME'),
  }),
  inject: [ConfigService],
});

// Analytics database (separate connection)
TsValidMongoModule.forRootAsync({
  connectionName: 'analytics',
  useFactory: (config: ConfigService) => ({
    uri: config.get('ANALYTICS_MONGO_URI'),
    databaseName: config.get('ANALYTICS_DB_NAME'),
  }),
  inject: [ConfigService],
});
```

### 2. Repository Pattern

Separate data access from business logic:

```typescript
@Injectable()
export class UsersRepository {
  constructor(@InjectModel('users') private model: Model<User>) {}

  async findByEmail(email: string) {
    return this.model.findOneBy({ email });
  }

  async findActive() {
    return this.model.find({ isActive: true });
  }
}

@Injectable()
export class UsersService {
  constructor(private repo: UsersRepository) {}

  async activateUser(email: string) {
    const user = await this.repo.findByEmail(email);
    // Business logic here
  }
}
```

### 3. Advanced Indexing

```typescript
TsValidMongoModule.forFeature([
  {
    name: 'users',
    schema: UserSchema,
    indexes: [
      // Unique index
      { key: { email: 1 }, unique: true },
      // Compound index
      { key: { lastName: 1, firstName: 1 } },
      // Text search index
      { key: { bio: 'text' } },
      // TTL index (auto-delete after 30 days)
      { key: { createdAt: 1 }, expireAfterSeconds: 2592000 },
    ],
  },
]);
```

### 4. Transactions

```typescript
@Injectable()
export class TransferService {
  constructor(@InjectConnection() private dbWrapper: MongoDbClientWrapper) {}

  async transferFunds(fromUser: string, toUser: string, amount: number) {
    const session = await this.dbWrapper.client.getDb().client.startSession();

    try {
      await session.withTransaction(async () => {
        await this.usersModel.updateById(fromUser, {
          mode: 'advanced',
          values: { $inc: { balance: -amount } },
        });

        await this.usersModel.updateById(toUser, {
          mode: 'advanced',
          values: { $inc: { balance: amount } },
        });
      });
    } finally {
      await session.endSession();
    }
  }
}
```

### 5. Error Handling

```typescript
try {
  await this.usersRepo.create(user);
} catch (error) {
  if (error instanceof TsValidMongoConnectionError) {
    throw new ServiceUnavailableException('Database connection failed');
  }
  throw new InternalServerErrorException('Failed to create user');
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# E2E tests
npm run test:e2e
```

## 📊 Monitoring

### Health Check Endpoints

```bash
# Overall health
GET /health

# Database health
GET /health/db
```

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Rebuild
docker-compose up --build
```

## 📚 What You Learned

- ✅ Production-ready configuration patterns
- ✅ Multiple database connections
- ✅ Repository pattern for clean architecture
- ✅ Advanced MongoDB features (indexes, transactions)
- ✅ Error handling strategies
- ✅ Health checks and monitoring
- ✅ Docker deployment

## 🎯 Next Steps

- Add authentication/authorization
- Implement caching layer
- Add API documentation (Swagger)
- Set up logging and monitoring
- Implement rate limiting

# @ioni/nest-zod-mongo

NestJS dynamic module for `@ioni/zod-mongo` — typed MongoDB repository injection with graceful
shutdown. MongoDB 6/7 compatible. NestJS 10/11 compatible.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module Setup](#module-setup)
  - [forRoot — Static Configuration](#forroot--static-configuration)
  - [forRootAsync — Factory Configuration](#forrootasync--factory-configuration)
  - [forFeature — Repository Registration](#forfeature--repository-registration)
- [Injecting Repositories and Connections](#injecting-repositories-and-connections)
- [Named Connections](#named-connections)
- [Index Synchronization](#index-synchronization)
- [Graceful Shutdown](#graceful-shutdown)
- [Error Types](#error-types)
- [API Reference](#api-reference)

---

## Features

- **Zero-boilerplate DI** — `@InjectRepository(UserCollection)` wires a fully-typed repository into
  any NestJS service
- **forRoot / forRootAsync / forFeature** — familiar NestJS dynamic module pattern
- **Named connections** — multiple MongoDB connections in the same app with full isolation
- **Graceful shutdown** — `OnApplicationShutdown` closes all connections with configurable timeout
  and retry
- **Index sync** — optional `createIndexes()` on module init, driven by the `CollectionDef`
  declaration
- **Global module** — providers registered once, available everywhere

---

## Installation

```bash
# npm
npm install @ioni/nest-zod-mongo @ioni/zod-mongo

# pnpm
pnpm add @ioni/nest-zod-mongo @ioni/zod-mongo
```

### Peer dependencies

```bash
npm install @nestjs/common@^10 @nestjs/core@^10 mongodb@^6
```

**Requirements:** Node `>=18.0.0`

---

## Quick Start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ZodMongoModule } from '@ioni/nest-zod-mongo';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ZodMongoModule.forRoot({
      uri: 'mongodb://localhost:27017',
      databaseName: 'myapp',
    }),
    UserModule,
  ],
})
export class AppModule {}
```

```typescript
// user/user.module.ts
import { Module } from '@nestjs/common';
import { ZodMongoModule } from '@ioni/nest-zod-mongo';
import { UserCollection } from './user.collection';
import { UserService } from './user.service';

@Module({
  imports: [ZodMongoModule.forFeature([UserCollection])],
  providers: [UserService],
})
export class UserModule {}
```

```typescript
// user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@ioni/nest-zod-mongo';
import type { Repository } from '@ioni/nest-zod-mongo';
import { UserCollection } from './user.collection';

type UserRepo = Repository<typeof UserCollection.schema, 'objectid'>;

@Injectable()
export class UserService {
  constructor(@InjectRepository(UserCollection) private readonly users: UserRepo) {}

  async create(name: string, email: string) {
    return this.users.insert({ name, email, createdAt: new Date() });
  }
}
```

---

## Module Setup

### forRoot — Static Configuration

Use when connection options are available at module load time.

```typescript
ZodMongoModule.forRoot({
  uri: 'mongodb://localhost:27017',
  databaseName: 'myapp',
});
```

#### Options

| Option                  | Type                 | Default     | Description                                                    |
| ----------------------- | -------------------- | ----------- | -------------------------------------------------------------- |
| `uri`                   | `string`             | —           | MongoDB connection URI (mutually exclusive with `mongoClient`) |
| `mongoClient`           | `MongoClient`        | —           | Pre-built client (mutually exclusive with `uri`)               |
| `databaseName`          | `string`             | —           | Database name                                                  |
| `connectionName`        | `string \| symbol`   | `'default'` | Token namespace for named connections                          |
| `syncIndexes`           | `boolean`            | `true`      | Call `createIndexes()` on module init                          |
| `clientOptions`         | `MongoClientOptions` | —           | Passed to `new MongoClient()` (only with `uri`)                |
| `shutdownTimeoutMs`     | `number`             | `10_000`    | Max ms to wait for `MongoClient.close()`                       |
| `shutdownRetryAttempts` | `number`             | `2`         | Retry attempts on close failure                                |
| `forceShutdown`         | `boolean`            | `false`     | Pass `force: true` to `MongoClient.close()`                    |

### forRootAsync — Factory Configuration

Use when options depend on a config service, environment variables, or other async sources.

```typescript
import { ConfigService } from '@nestjs/config';

ZodMongoModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    uri: config.get<string>('MONGO_URI'),
    databaseName: config.get<string>('MONGO_DB'),
  }),
  inject: [ConfigService],
});
```

### forFeature — Repository Registration

Register one or more collections in a feature module. Optionally scope to a named connection.

```typescript
// Default connection
ZodMongoModule.forFeature([UserCollection, PostCollection]);

// Named connection
ZodMongoModule.forFeature([OrderCollection], 'analytics');
```

Each collection gets a repository provider keyed by
`getRepositoryToken(collection.name, connectionName)`, injectable via `@InjectRepository`.

---

## Injecting Repositories and Connections

### @InjectRepository

Inject a typed repository for a collection. Accepts a `CollectionDef` or a plain string name.

```typescript
// With CollectionDef (recommended — type-safe)
@InjectRepository(UserCollection) private readonly users: UserRepo

// With plain string
@InjectRepository('users') private readonly users: UserRepo

// Named connection
@InjectRepository(OrderCollection, 'analytics') private readonly orders: OrderRepo
```

### @InjectConnection

Inject the raw `Db` handle for direct driver access.

```typescript
import { InjectConnection } from '@ioni/nest-zod-mongo'
import type { Db } from 'mongodb'

@Injectable()
export class AdminService {
  constructor(@InjectConnection() private readonly db: Db) {}

  async stats() {
    return this.db.stats()
  }
}

// Named connection
@InjectConnection('analytics') private readonly analyticsDb: Db
```

---

## Named Connections

Register multiple `forRoot` calls with distinct `connectionName` values. Each connection manages its
own `MongoClient`, `Db`, and shutdown lifecycle independently.

```typescript
@Module({
  imports: [
    ZodMongoModule.forRoot({
      uri: process.env.PRIMARY_MONGO_URI,
      databaseName: 'app',
      connectionName: 'primary',
    }),
    ZodMongoModule.forRoot({
      uri: process.env.ANALYTICS_MONGO_URI,
      databaseName: 'analytics',
      connectionName: 'analytics',
    }),
    UserModule,
    ReportingModule,
  ],
})
export class AppModule {}
```

```typescript
// user.module.ts
ZodMongoModule.forFeature([UserCollection], 'primary');

// reporting.module.ts
ZodMongoModule.forFeature([EventCollection], 'analytics');
```

---

## Index Synchronization

When `syncIndexes: true` (default), the module calls `createIndexes()` for every collection
registered via `forFeature`. Indexes are declared in `defineCollection()` using the `index()` helper
from `@ioni/zod-mongo`.

```typescript
import { defineCollection, index } from '@ioni/nest-zod-mongo';
import * as z from 'zod';

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ email: z.string(), name: z.string() }),
  indexes: [index({ email: 1 }, { unique: true })],
});
```

MongoDB skips indexes that already exist — safe to run on every startup.

To disable: `ZodMongoModule.forRoot({ ..., syncIndexes: false })`.

---

## Graceful Shutdown

`ZodMongoModule` implements `OnApplicationShutdown`. When `app.close()` is called, all registered
`MongoClient` instances are closed in parallel with timeout and retry protection.

Enable shutdown hooks in your bootstrap:

```typescript
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
await app.listen(3000);
```

Configure shutdown behavior via `forRoot` options:

```typescript
ZodMongoModule.forRoot({
  uri: '...',
  databaseName: 'myapp',
  shutdownTimeoutMs: 5_000, // give each close() 5 seconds
  shutdownRetryAttempts: 3, // retry up to 3 times on failure
  forceShutdown: false, // set true to force-close (drops in-flight ops)
});
```

---

## Error Types

| Error                        | When thrown                                         |
| ---------------------------- | --------------------------------------------------- |
| `ZodMongoConnectionError`    | `MongoClient.connect()` fails during module init    |
| `ZodMongoConfigurationError` | Neither `uri` nor `mongoClient` provided in options |

Both extend `Error` and are exported for use in `catch` blocks or NestJS exception filters.

```typescript
import { ZodMongoConnectionError } from '@ioni/nest-zod-mongo';

try {
  await app.init();
} catch (error) {
  if (error instanceof ZodMongoConnectionError) {
    console.error('Could not connect to MongoDB:', error.message);
  }
}
```

---

## API Reference

### ZodMongoModule

| Method                           | Returns         | Description                                       |
| -------------------------------- | --------------- | ------------------------------------------------- |
| `forRoot(options)`               | `DynamicModule` | Static connection setup                           |
| `forRootAsync(asyncOptions)`     | `DynamicModule` | Factory-based connection setup                    |
| `forFeature(collections, name?)` | `DynamicModule` | Register repository providers in a feature module |

### Token helpers

```typescript
import { getRepositoryToken, getConnectionToken, DEFAULT_CONNECTION } from '@ioni/nest-zod-mongo';

getRepositoryToken('users'); // 'usersRepository'
getRepositoryToken('users', 'analytics'); // 'analytics_usersRepository'
getConnectionToken(); // DEFAULT_CONNECTION symbol
getConnectionToken('analytics'); // 'analytics'
```

### Re-exports from @ioni/zod-mongo

For convenience, the following are re-exported so you don't need to install `@ioni/zod-mongo`
separately for common types:

```typescript
import { defineCollection, ok, err, isOk, isErr } from '@ioni/nest-zod-mongo';
import type { Repository, CollectionDef, Doc, Result, DbError } from '@ioni/nest-zod-mongo';
```

---

## License

MIT

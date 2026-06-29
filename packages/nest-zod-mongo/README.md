# @wenu/nest-mongo

NestJS dynamic module for `@wenu/mongo` — typed MongoDB repository injection with graceful shutdown.
MongoDB 5/6/7 compatible. NestJS 10/11 compatible.

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
- [Health Checks](#health-checks)
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
- **Health checks** — opt-in `MongoHealthModule` for `@nestjs/terminus` integration
- **Global module** — providers registered once, available everywhere

---

## Installation

```bash
# npm
npm install @wenu/nest-mongo @wenu/mongo

# pnpm
pnpm add @wenu/nest-mongo @wenu/mongo
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
import { MongoModule } from '@wenu/nest-mongo';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    MongoModule.forRoot({
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
import { MongoModule } from '@wenu/nest-mongo';
import { UserCollection } from './user.collection';
import { UserService } from './user.service';

@Module({
  imports: [MongoModule.forFeature([UserCollection])],
  providers: [UserService],
})
export class UserModule {}
```

```typescript
// user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@wenu/nest-mongo';
import type { Repository } from '@wenu/nest-mongo';
import { UserCollection } from './user.collection';

type UserRepo = Repository<typeof UserCollection.schema, 'objectid'>;

@Injectable()
export class UserService {
  constructor(@InjectRepository(UserCollection) private readonly users: UserRepo) {}

  async create(name: string, email: string) {
    return this.users.insert({ name, email, createdAt: new Date() });
  }

  async exists(email: string) {
    const result = await this.users.exists({ email });
    return result.ok ? result.value : false;
  }

  async count() {
    const result = await this.users.count();
    return result.ok ? result.value : 0;
  }

  async upsert(id: string, name: string, email: string) {
    // Insert if not found, replace if found — _id always preserved
    return this.users.upsertById(id, { name, email, createdAt: new Date() });
  }
}
```

---

## Module Setup

### forRoot — Static Configuration

Use when connection options are available at module load time.

```typescript
MongoModule.forRoot({
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

MongoModule.forRootAsync({
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
MongoModule.forFeature([UserCollection, PostCollection]);

// Named connection
MongoModule.forFeature([OrderCollection], 'analytics');
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
import { InjectConnection } from '@wenu/nest-mongo'
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
    MongoModule.forRoot({
      uri: process.env.PRIMARY_MONGO_URI,
      databaseName: 'app',
      connectionName: 'primary',
    }),
    MongoModule.forRoot({
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
MongoModule.forFeature([UserCollection], 'primary');

// reporting.module.ts
MongoModule.forFeature([EventCollection], 'analytics');
```

---

## Index Synchronization

When `syncIndexes: true` (default), the module calls `createIndexes()` for every collection
registered via `forFeature`. Indexes are declared in `defineCollection()` using the `index()` helper
from `@wenu/mongo`.

```typescript
import { defineCollection, index } from '@wenu/nest-mongo';
import * as z from 'zod';

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ email: z.string(), name: z.string() }),
  indexes: [index({ email: 1 }, { unique: true })],
});
```

MongoDB skips indexes that already exist — safe to run on every startup.

To disable: `MongoModule.forRoot({ ..., syncIndexes: false })`.

---

## Graceful Shutdown

`MongoModule` implements `OnApplicationShutdown`. When `app.close()` is called, all registered
`MongoClient` instances are closed in parallel with timeout and retry protection.

Enable shutdown hooks in your bootstrap:

```typescript
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
await app.listen(3000);
```

Configure shutdown behavior via `forRoot` options:

```typescript
MongoModule.forRoot({
  uri: '...',
  databaseName: 'myapp',
  shutdownTimeoutMs: 5_000, // give each close() 5 seconds
  shutdownRetryAttempts: 3, // retry up to 3 times on failure
  forceShutdown: false, // set true to force-close (drops in-flight ops)
});
```

---

## Health Checks

`MongoHealthModule` provides an opt-in `MongoHealthIndicator` that integrates with
`@nestjs/terminus`. It requires `@nestjs/terminus >=10.0.0` as a peer dependency — only install it
if you use health checks.

```bash
npm install @nestjs/terminus
```

```typescript
// health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MongoHealthModule } from '@wenu/nest-mongo';

@Module({
  imports: [TerminusModule, MongoHealthModule],
})
export class HealthModule {}
```

```typescript
// health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { InjectConnection } from '@wenu/nest-mongo';
import { MongoHealthIndicator } from '@wenu/nest-mongo';
import type { Db } from 'mongodb';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoHealth: MongoHealthIndicator,
    @InjectConnection() private readonly db: Db,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.mongoHealth.isHealthy('mongodb', this.db)]);
  }
}
```

The indicator calls `db.command({ ping: 1 })` and returns `{ status: 'up' }` on success or
`{ status: 'down', error }` on failure.

---

## Error Types

| Error                     | When thrown                                         |
| ------------------------- | --------------------------------------------------- |
| `MongoConnectionError`    | `MongoClient.connect()` fails during module init    |
| `MongoConfigurationError` | Neither `uri` nor `mongoClient` provided in options |

Both extend `Error` and are exported for use in `catch` blocks or NestJS exception filters.

```typescript
import { MongoConnectionError } from '@wenu/nest-mongo';

try {
  await app.init();
} catch (error) {
  if (error instanceof MongoConnectionError) {
    console.error('Could not connect to MongoDB:', error.message);
  }
}
```

---

## API Reference

### MongoModule

| Method                           | Returns         | Description                                       |
| -------------------------------- | --------------- | ------------------------------------------------- |
| `forRoot(options)`               | `DynamicModule` | Static connection setup                           |
| `forRootAsync(asyncOptions)`     | `DynamicModule` | Factory-based connection setup                    |
| `forFeature(collections, name?)` | `DynamicModule` | Register repository providers in a feature module |

### Token helpers

```typescript
import { getRepositoryToken, getConnectionToken, DEFAULT_CONNECTION } from '@wenu/nest-mongo';

getRepositoryToken('users'); // 'usersRepository'
getRepositoryToken('users', 'analytics'); // 'analytics_usersRepository'
getConnectionToken(); // DEFAULT_CONNECTION symbol
getConnectionToken('analytics'); // 'analytics'
```

### MongoHealthModule

| Export                 | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `MongoHealthModule`    | Opt-in NestJS module — import alongside `TerminusModule`           |
| `MongoHealthIndicator` | Injectable indicator — call `isHealthy(key, db)` in a health check |

Requires `@nestjs/terminus >=10.0.0` as an optional peer dependency.

### Re-exports from @wenu/mongo

For convenience, the following are re-exported so you don't need to install `@wenu/mongo` separately
for common types:

```typescript
import { defineCollection, ok, err, isOk, isErr, NotFoundError } from '@wenu/nest-mongo';
import { MongoHealthIndicator, MongoHealthModule } from '@wenu/nest-mongo';
import type { Repository, CollectionDef, Doc, Result, DbError } from '@wenu/nest-mongo';
```

---

## License

MIT

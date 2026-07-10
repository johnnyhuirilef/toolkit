# @wenu/nest-mongo

[![npm](https://img.shields.io/npm/v/@wenu/nest-mongo)](https://www.npmjs.com/package/@wenu/nest-mongo)
[![node](https://img.shields.io/node/v/@wenu/nest-mongo)](https://www.npmjs.com/package/@wenu/nest-mongo)

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
- [Defining Collections](#defining-collections)
  - [ID Strategies](#id-strategies)
  - [Index Declarations](#index-declarations)
- [Injecting Repositories and Connections](#injecting-repositories-and-connections)
- [Working with Repositories](#working-with-repositories)
  - [Result Type](#result-type)
  - [Find](#find)
  - [query() builder](#query-builder)
  - [Count and Exists](#count-and-exists)
  - [Insert](#insert)
  - [Upsert](#upsert)
  - [Update](#update)
  - [Atomic operations — updateRaw](#atomic-operations--updateraw)
  - [Delete](#delete)
  - [Aggregation](#aggregation)
  - [session()](#session)
- [Named Connections](#named-connections)
- [Index Synchronization](#index-synchronization)
- [Graceful Shutdown](#graceful-shutdown)
- [Health Checks](#health-checks)
- [Transactions](#transactions)
- [Error Handling](#error-handling)
- [Using this in a hexagonal / clean architecture setup](#using-this-in-a-hexagonal--clean-architecture-setup)
  - [Testing](#testing)
- [Security](#security)
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
- **Transactions** — opt-in `MongoTransactionModule` for multi-document atomic operations
- **Zero throws** — every repository method returns `Result<T, DbError>`, never throws
- **Full type inference** — document shape, `_id` type, and filter types flow from a single
  `defineCollection()` call
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
npm install @nestjs/common@"^10 || ^11" @nestjs/core@"^10 || ^11" mongodb@">=5"
```

**Requirements:** Node `>=22.0.0`

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
// user/user.collection.ts
import * as z from 'zod';
import { defineCollection, index } from '@wenu/nest-mongo';

export const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    createdAt: z.date(),
  }),
  indexes: [index({ email: 1 }, { unique: true })],
});
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

## Defining Collections

`defineCollection()` is the single source of truth for a collection's shape, ID strategy, and
indexes. Import it directly from `@wenu/nest-mongo` — no need to install `@wenu/mongo` separately.

```typescript
import * as z from 'zod';
import { defineCollection, index } from '@wenu/nest-mongo';

export const ProductCollection = defineCollection({
  name: 'products',
  schema: z.object({
    sku: z.string(),
    name: z.string(),
    price: z.number().positive(),
    tags: z.array(z.string()).default([]),
  }),
  idStrategy: 'uuid',
  indexes: [index({ sku: 1 }, { unique: true }), index({ tags: 1 })],
});
```

The `Doc<Schema, Id>` type resolves to the schema output merged with the inferred `_id` type:

```typescript
import type { Doc } from '@wenu/nest-mongo';

type Product = Doc<typeof ProductCollection.schema, typeof ProductCollection.id>;
// { _id: string; sku: string; name: string; price: number; tags: string[] }
```

### ID Strategies

Set `idStrategy` in `defineCollection()`. The `_id` type on every document is inferred
automatically. `id` is still accepted as a deprecated alias for `idStrategy` — do not pass both in
the same call.

| Strategy               | `_id` type      | Auto-generated              |
| ---------------------- | --------------- | --------------------------- |
| `'objectid'` (default) | `ObjectId`      | Yes — `new ObjectId()`      |
| `'uuid'`               | `string`        | Yes — `crypto.randomUUID()` |
| `'string'`             | `string`        | No — embed `_id` in data    |
| Any Zod schema         | `Infer<Schema>` | No — embed `_id` in data    |

```typescript
// objectid (default) — _id is ObjectId, never in input
const PostCollection = defineCollection({
  name: 'posts',
  schema: z.object({ title: z.string(), body: z.string() }),
});

// uuid — _id is string (UUID v4), never in input
const SessionCollection = defineCollection({
  name: 'sessions',
  schema: z.object({ userId: z.string(), expiresAt: z.date() }),
  idStrategy: 'uuid',
});

// string — caller supplies _id; include it in the schema.
// idStrategy: 'string' means "declare _id directly in your schema" — an
// unrelated `id` domain field is fine to have but is never touched by the library.
const CountryCollection = defineCollection({
  name: 'countries',
  schema: z.object({ _id: z.string(), name: z.string() }),
  idStrategy: 'string',
});

// Custom Zod schema — branded type
const OrderId = z.string().brand<'OrderId'>();
const OrderCollection = defineCollection({
  name: 'orders',
  schema: z.object({ _id: OrderId, total: z.number() }),
  idStrategy: OrderId,
});
```

### Index Declarations

```typescript
import { defineCollection, index } from '@wenu/nest-mongo';

const ArticleCollection = defineCollection({
  name: 'articles',
  schema: z.object({
    slug: z.string(),
    authorId: z.string(),
    publishedAt: z.date().optional(),
    tags: z.array(z.string()).default([]),
  }),
  indexes: [
    index({ slug: 1 }, { unique: true }),
    index({ authorId: 1, publishedAt: -1 }),
    index({ tags: 1 }),
  ],
});
```

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
import { InjectConnection } from '@wenu/nest-mongo';
import type { Db } from 'mongodb';

@Injectable()
export class AdminService {
  constructor(@InjectConnection() private readonly db: Db) {}

  async stats() {
    return this.db.stats();
  }
}

// Named connection
@InjectConnection('analytics') private readonly analyticsDb: Db
```

---

## Working with Repositories

All repository methods return `Promise<Result<T, DbError>>` — they never throw. The injected
repository type is `Repository<Schema, Id>`.

### Result Type

```typescript
type Ok<T> = { readonly ok: true; readonly value: T };
type Err<E> = { readonly ok: false; readonly error: E };
type Result<T, E = DbError> = Ok<T> | Err<E>;
```

Use the `ok` discriminant or the `isOk` / `isErr` helpers:

```typescript
import { isOk, isErr } from '@wenu/nest-mongo';

const result = await this.users.findById(id);

if (result.ok) {
  console.log(result.value); // Doc | null
}

if (isErr(result)) {
  console.error(result.error.kind, result.error.message);
}
```

### Find

```typescript
// By ID
const byId = await this.users.findById(someObjectId);

// By filter — returns first match or null
const byEmail = await this.users.findOne({ email: 'alice@example.com' });

// All matching documents
const all = await this.users.find({ name: /alice/i });

// All documents
const everyone = await this.users.find();

// With FindOptions (sort, limit, projection, etc.)
const latest = await this.users.find({}, { sort: { createdAt: -1 }, limit: 10 });
```

### query() builder

`query()` returns a chainable, immutable `QueryBuilder` for complex reads:

```typescript
// Equivalent to find() with options
const result = await this.users
  .query()
  .filter({ status: 'active' })
  .sort({ createdAt: -1 })
  .limit(10)
  .skip(20)
  .exec();

if (result.ok) {
  for (const user of result.value) {
    console.log(user.name);
  }
}
```

Each chain call returns a new, independent builder — the original is never mutated:

```typescript
const base = this.users.query().filter({ status: 'active' });
const page1 = base.limit(10).skip(0);
const page2 = base.limit(10).skip(10); // independent from page1
```

### Count and Exists

```typescript
const total = await this.users.count();
if (total.ok) console.log(total.value); // number

const admins = await this.users.count({ role: 'admin' });

// cheaper than count — uses limit: 1 internally
const hasAdmin = await this.users.exists({ role: 'admin' });
if (hasAdmin.ok) console.log(hasAdmin.value); // boolean
```

### Insert

```typescript
// Single document — validated before insert
const inserted = await this.users.insert({
  name: 'Bob',
  email: 'bob@example.com',
  createdAt: new Date(),
});

// Multiple — validates all first; any failure aborts before any DB write
const many = await this.users.insertMany([
  { name: 'Carol', email: 'carol@example.com', createdAt: new Date() },
  { name: 'Dave', email: 'dave@example.com', createdAt: new Date() },
]);
```

### Upsert

`upsertById` uses the caller-supplied `id` as `_id` on the insert path. `upsertOne` matches by
filter — generates a new `_id` on insert, preserves the existing one on replace.

```typescript
// Insert or replace by explicit ID
const result = await this.products.upsertById('sku-123', {
  sku: 'sku-123',
  name: 'Widget',
  price: 9.99,
  tags: [],
});

// Insert or replace by filter
const bySlug = await this.products.upsertOne(
  { sku: 'sku-456' },
  { sku: 'sku-456', name: 'Gadget', price: 19.99, tags: ['new'] },
);
```

### Update

```typescript
// By ID — returns updated document or null
const updated = await this.users.updateById(someObjectId, { name: 'Alice Smith' });

// By filter — returns updated document or null
const updatedOne = await this.users.updateOne(
  { email: 'alice@example.com' },
  { name: 'Alice Smith' },
);

// Bulk — returns { modifiedCount }
const bulk = await this.users.updateMany(
  { createdAt: { $lt: new Date('2024-01-01') } },
  { name: 'archived' },
);
if (bulk.ok) console.log(`Updated ${bulk.value.modifiedCount} documents`);
```

All update methods accept an optional `options` forwarded to the driver:

```typescript
// FindOneAndUpdateOptions on updateById / updateOne
await this.users.updateById(id, { name: 'Alice' }, { comment: 'profile-update' });

// UpdateOptions on updateMany
await this.users.updateMany(
  { role: 'guest' },
  { role: 'user' },
  { writeConcern: { w: 'majority' } },
);
```

### Atomic operations — `updateRaw`

For MongoDB operators (`$inc`, `$push`, `$pull`, `$unset`, etc.) that can't be expressed as a
validated partial update, use `updateRaw`. It passes the `UpdateFilter` directly to the driver
without `$set` wrapping or schema validation:

```typescript
// Increment a counter
await this.users.updateRaw({ _id: id }, { $inc: { loginCount: 1 } });

// Push to an array
await this.users.updateRaw({ _id: id }, { $push: { tags: 'premium' } });

// Pull from an array
await this.users.updateRaw({ _id: id }, { $pull: { tags: 'trial' } });

// With options — returns { modifiedCount }
const result = await this.users.updateRaw(
  { status: 'inactive' },
  { $set: { archivedAt: new Date() } },
  { writeConcern: { w: 'majority' } },
);
if (result.ok) console.log(`Archived ${result.value.modifiedCount} users`);
```

> `updateRaw` matches all documents (equivalent to `updateMany` in scope). Use it only when atomic
> operators are required — prefer `updateById`, `updateOne`, or `updateMany` for validated patches.
>
> `updateRaw` does not validate the `update` argument — see [Security](#security) before passing it
> anything derived from user input.

### Delete

```typescript
// By ID — returns deleted document or null
const deleted = await this.users.deleteById(someObjectId);

// By filter — returns deleted document or null
const deletedOne = await this.users.deleteOne({ email: 'bob@example.com' });

// Bulk — returns { deletedCount }
const bulk = await this.users.deleteMany({ createdAt: { $lt: cutoff } });
if (bulk.ok) console.log(`Deleted ${bulk.value.deletedCount} documents`);
```

### Aggregation

Pass the pipeline and an output schema. Results are parsed through the schema and returned as
`Result<Infer<Out>[]>`. The output schema does not need to match the collection schema.

```typescript
import * as z from 'zod';

const SummarySchema = z.object({
  authorId: z.string(),
  articleCount: z.number(),
});

const result = await this.articles.aggregate(
  [
    { $match: { publishedAt: { $exists: true } } },
    { $group: { _id: '$authorId', articleCount: { $sum: 1 } } },
    { $project: { authorId: '$_id', articleCount: 1, _id: 0 } },
  ],
  SummarySchema,
);

if (result.ok) {
  for (const summary of result.value) {
    console.log(summary.authorId, summary.articleCount);
  }
}
```

### session()

`repo.session(clientSession)` returns a new repository view that threads the `ClientSession` into
every driver call. The base repository is unaffected. Use it inside a `withTransaction` callback
(see [Transactions](#transactions)).

```typescript
await session.withTransaction(async () => {
  await this.accounts.session(session).updateRaw({ _id: fromId }, { $inc: { balance: -amount } });
  await this.accounts.session(session).updateRaw({ _id: toId }, { $inc: { balance: amount } });
});
```

Calling `repo.session(s1).session(s2)` binds `s2`, discarding `s1`. Immutable — never mutates the
original repository.

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
registered via `forFeature`. MongoDB skips indexes that already exist — safe to run on every
startup.

Indexes are declared in `defineCollection()` using the `index()` helper:

```typescript
import { defineCollection, index } from '@wenu/nest-mongo';

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ email: z.string(), name: z.string() }),
  indexes: [index({ email: 1 }, { unique: true })],
});
```

To disable: `MongoModule.forRoot({ ..., syncIndexes: false })`.

You can also sync or generate a migrate-mongo migration manually:

```typescript
import { syncIndexes, generateIndexMigration } from '@wenu/nest-mongo';

// Sync manually (e.g. in a CLI script)
const result = await syncIndexes(UserCollection, db);
if (!result.ok) console.error('Index sync failed:', result.error.message);

// Generate a migrate-mongo migration file
const migration = generateIndexMigration(UserCollection);
fs.writeFileSync('migrations/20240101-users-indexes.js', migration);
```

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
  shutdownTimeoutMs: 5_000,
  shutdownRetryAttempts: 3,
  forceShutdown: false,
});
```

---

## Health Checks

`MongoHealthModule` provides an opt-in `MongoHealthIndicator` that integrates with
`@nestjs/terminus`. Requires `@nestjs/terminus >=10.0.0` as a peer dependency.

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
import { InjectConnection, MongoHealthIndicator } from '@wenu/nest-mongo';
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
`{ status: 'down', kind, message }` on failure — `kind` is the `DbErrorKind` discriminant
(`'connection'`, `'unknown'`, ...) and `message` is a static string. Raw driver error detail is
written to the server-side logger, never to the health response.

---

## Transactions

`MongoTransactionModule` provides `MongoTransactionService` for executing multi-document operations
within a MongoDB transaction. This is an opt-in module — it is NOT registered automatically by
`MongoModule.forRoot()`.

> **Requirement**: transactions require a MongoDB replica set (or sharded cluster). They will not
> work against a standalone `mongod` instance.

### Module Registration

```typescript
// transfer.module.ts
import { Module } from '@nestjs/common';
import { MongoModule, MongoTransactionModule } from '@wenu/nest-mongo';
import { AccountCollection } from './account.collection';
import { LedgerCollection } from './ledger.collection';
import { TransferService } from './transfer.service';

@Module({
  imports: [
    MongoModule.forFeature([AccountCollection, LedgerCollection]),
    MongoTransactionModule.forFeature(), // default connection
  ],
  providers: [TransferService],
})
export class TransferModule {}

// Named connection
MongoTransactionModule.forFeature({ connectionName: 'primary' });
```

### Using `MongoTransactionService`

Inject `MongoTransactionService` and call `run(fn)`. The callback receives a `ClientSession` already
enlisted in the transaction. Returns `Result<T>` — never throws.

```typescript
// transfer.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository, MongoTransactionService } from '@wenu/nest-mongo';
import type { Repository } from '@wenu/nest-mongo';
import type { ClientSession } from 'mongodb';
import { AccountCollection } from './account.collection';
import { LedgerCollection } from './ledger.collection';

type AccountRepo = Repository<typeof AccountCollection.schema, 'objectid'>;
type LedgerRepo = Repository<typeof LedgerCollection.schema, 'objectid'>;

@Injectable()
export class TransferService {
  constructor(
    @InjectRepository(AccountCollection) private readonly accounts: AccountRepo,
    @InjectRepository(LedgerCollection) private readonly ledger: LedgerRepo,
    private readonly transactions: MongoTransactionService,
  ) {}

  async transfer(fromId: string, toId: string, amount: number) {
    return this.transactions.run(async (session: ClientSession) => {
      await this.accounts
        .session(session)
        .updateRaw({ _id: fromId }, { $inc: { balance: -amount } });
      await this.accounts.session(session).updateRaw({ _id: toId }, { $inc: { balance: amount } });
      await this.ledger.session(session).insert({ fromId, toId, amount, createdAt: new Date() });
    });
  }
}
```

If the callback throws, `run` catches the error and returns `{ ok: false, error: DbError }`. On
success: `{ ok: true, value: T }`.

---

## Error Handling

`DbError` carries a discriminated `kind` field — branch on error type without inspecting strings:

```typescript
import type { DbError } from '@wenu/nest-mongo';

type DbErrorKind =
  | 'validation' // Zod parse failed — no DB call was made
  | 'duplicate-key' // MongoDB error code 11000 (unique index violation)
  | 'not-found' // upsert returned null after write
  | 'connection' // reserved for future use
  | 'unknown'; // any other driver error
```

```typescript
const result = await this.products.insert({ sku: 'existing-sku', name: 'X', price: 10, tags: [] });

if (!result.ok) {
  switch (result.error.kind) {
    case 'duplicate-key':
      throw new ConflictException('SKU already exists');
    case 'validation':
      throw new BadRequestException(result.error.message);
    default:
      throw new InternalServerErrorException(result.error.message);
  }
}
```

Convert any caught value to a `DbError` with `toDbError`:

```typescript
import { toDbError, NotFoundError } from '@wenu/nest-mongo';

try {
  // ...
} catch (error) {
  if (error instanceof NotFoundError) {
    // kind: 'not-found'
  }
  const dbError = toDbError(error);
}
```

Module-level errors thrown during bootstrap:

| Error                     | When thrown                                         |
| ------------------------- | --------------------------------------------------- |
| `MongoConnectionError`    | `MongoClient.connect()` fails during module init    |
| `MongoConfigurationError` | Neither `uri` nor `mongoClient` provided in options |

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

### Repository\<Schema, Id\> methods

| Method                                | Returns                                      |
| ------------------------------------- | -------------------------------------------- |
| `findById(id, options?)`              | `Promise<Result<Doc \| null>>`               |
| `findOne(filter, options?)`           | `Promise<Result<Doc \| null>>`               |
| `find(filter?, options?)`             | `Promise<Result<Doc[]>>`                     |
| `query()`                             | `QueryBuilder<Schema, Id>`                   |
| `count(filter?)`                      | `Promise<Result<number>>`                    |
| `exists(filter)`                      | `Promise<Result<boolean>>`                   |
| `insert(data)`                        | `Promise<Result<Doc>>`                       |
| `insertMany(data)`                    | `Promise<Result<Doc[]>>`                     |
| `upsertById(id, data)`                | `Promise<Result<Doc>>`                       |
| `upsertOne(filter, data)`             | `Promise<Result<Doc>>`                       |
| `updateById(id, patch, options?)`     | `Promise<Result<Doc \| null>>`               |
| `updateOne(filter, patch, options?)`  | `Promise<Result<Doc \| null>>`               |
| `updateMany(filter, patch, options?)` | `Promise<Result<{ modifiedCount: number }>>` |
| `updateRaw(filter, update, options?)` | `Promise<Result<{ modifiedCount: number }>>` |
| `deleteById(id)`                      | `Promise<Result<Doc \| null>>`               |
| `deleteOne(filter)`                   | `Promise<Result<Doc \| null>>`               |
| `deleteMany(filter?)`                 | `Promise<Result<{ deletedCount: number }>>`  |
| `aggregate(pipeline, outputSchema)`   | `Promise<Result<Infer<Out>[]>>`              |
| `session(clientSession)`              | `Repository<Schema, Id>`                     |

**`options` types by method:**

| Method group                  | `options` type            |
| ----------------------------- | ------------------------- |
| `findById`, `findOne`, `find` | `FindOptions<Doc>`        |
| `updateById`, `updateOne`     | `FindOneAndUpdateOptions` |
| `updateMany`, `updateRaw`     | `UpdateOptions`           |

All types imported from `mongodb` — no custom wrappers.

### QueryBuilder\<Schema, Id\>

Returned by `repo.query()`. Each method returns a new, independent builder.

| Method           | Parameter                 | Returns                    |
| ---------------- | ------------------------- | -------------------------- |
| `filter(filter)` | `Filter<Doc<Schema, Id>>` | `QueryBuilder<Schema, Id>` |
| `sort(sort)`     | `Sort` (from `mongodb`)   | `QueryBuilder<Schema, Id>` |
| `limit(n)`       | `number`                  | `QueryBuilder<Schema, Id>` |
| `skip(n)`        | `number`                  | `QueryBuilder<Schema, Id>` |
| `exec()`         | —                         | `Promise<Result<Doc[]>>`   |

### Decorators

| Decorator                       | Description                                                            |
| ------------------------------- | ---------------------------------------------------------------------- |
| `@InjectRepository(col, name?)` | Inject a typed `Repository` for a collection                           |
| `@InjectConnection(name?)`      | Inject the raw `Db` handle                                             |
| `@InjectClientWrapper(name?)`   | Inject the `MongoClientWrapper` (advanced — needed for custom modules) |

### Token helpers

```typescript
import {
  getRepositoryToken,
  getConnectionToken,
  getClientWrapperToken,
  DEFAULT_CONNECTION,
} from '@wenu/nest-mongo';

getRepositoryToken('users'); // 'usersRepository'
getRepositoryToken('users', 'analytics'); // 'analytics_usersRepository'
getConnectionToken(); // DEFAULT_CONNECTION symbol
getConnectionToken('analytics'); // 'analytics'
getClientWrapperToken(); // 'MongoClientWrapper_default'
getClientWrapperToken('secondary'); // 'MongoClientWrapper_secondary'
```

### Result helpers

| Export          | Signature                                | Description                        |
| --------------- | ---------------------------------------- | ---------------------------------- |
| `ok`            | `<T>(value: T) => Ok<T>`                 | Construct a success result         |
| `err`           | `<E>(error: E) => Err<E>`                | Construct an error result          |
| `isOk`          | `<T, E>(r: Result<T, E>) => r is Ok<T>`  | Type guard for success             |
| `isErr`         | `<T, E>(r: Result<T, E>) => r is Err<E>` | Type guard for error               |
| `toDbError`     | `(e: unknown) => DbError`                | Map any thrown value to `DbError`  |
| `NotFoundError` | `class extends Error`                    | Domain error → `kind: 'not-found'` |

### MongoHealthModule

| Export                 | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `MongoHealthModule`    | Opt-in NestJS module — import alongside `TerminusModule`           |
| `MongoHealthIndicator` | Injectable indicator — call `isHealthy(key, db)` in a health check |

Requires `@nestjs/terminus >=10.0.0` as an optional peer dependency.

### MongoTransactionModule

| Export                    | Description                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `MongoTransactionModule`  | Opt-in NestJS module — call `forFeature(options?)` in the consuming feature module |
| `MongoTransactionService` | Injectable service — call `run(fn)` to execute a callback inside a transaction     |

`forFeature` options:

| Option           | Type               | Default     | Description                                    |
| ---------------- | ------------------ | ----------- | ---------------------------------------------- |
| `connectionName` | `string \| symbol` | `'default'` | Matches the `connectionName` used in `forRoot` |

`run<T>(fn: (session: ClientSession) => Promise<T>): Promise<Result<T>>`

Requires a MongoDB replica set or sharded cluster.

### Index utilities

| Export                        | Description                                                       |
| ----------------------------- | ----------------------------------------------------------------- |
| `index(spec, options?)`       | Create an `IndexDef` for use in `defineCollection()`              |
| `syncIndexes(col, db)`        | Sync declared indexes to MongoDB. Returns `Promise<Result<void>>` |
| `generateIndexMigration(col)` | Returns a migrate-mongo compatible JS migration string            |

---

## Using this in a hexagonal / clean architecture setup

`@wenu/mongo`'s `createRepository(collection, db)` is already framework-agnostic — it accepts a
`DatabaseLike` (a structural subset of `Db`, not a NestJS type) and returns a plain object with zero
Nest dependency. `@wenu/nest-mongo` only adds the Nest infrastructure layer on top: DI, connection
lifecycle, graceful shutdown, health checks.

That split lets a consumer keep their domain/application layer depending on **their own** repository
port — not `@wenu/mongo`'s `Repository<Schema, Id>` directly, not anything Nest-shaped — while still
reusing `nest-mongo`'s infrastructure for the Nest-hosted deployment.

```typescript
// domain/product.repository.ts — port, zero infra imports
import type { Result } from '@wenu/mongo';

export interface ProductRepository {
  save(product: Product): Promise<Result<Product, ProductRepositoryError>>;
  findById(id: string): Promise<Result<Product | null, ProductRepositoryError>>;
}

export type Product = { readonly id: string; readonly name: string; readonly price: number };
export type ProductRepositoryError = { readonly kind: 'unknown'; readonly message: string };
```

```typescript
// infrastructure/mongo/product.collection.ts
import * as z from 'zod';
import { defineCollection } from '@wenu/mongo';

export const ProductCollection = defineCollection({
  name: 'products',
  schema: z.object({ _id: z.string(), name: z.string(), price: z.number().positive() }),
  idStrategy: 'string',
});
```

```typescript
// infrastructure/mongo/product-mongo.repository.ts — adapter, only depends on @wenu/mongo
import { createRepository } from '@wenu/mongo';
import type { DatabaseLike, Repository, Result } from '@wenu/mongo';

import type {
  Product,
  ProductRepository,
  ProductRepositoryError,
} from '../../domain/product.repository';
import { ProductCollection } from './product.collection';

export class ProductMongoRepository implements ProductRepository {
  private readonly repo: Repository<typeof ProductCollection.schema, 'string'>;

  constructor(db: DatabaseLike) {
    this.repo = createRepository(ProductCollection, db);
  }

  async save(product: Product): Promise<Result<Product, ProductRepositoryError>> {
    const result = await this.repo.upsertById(product.id, {
      _id: product.id,
      name: product.name,
      price: product.price,
    });
    if (!result.ok) return { ok: false, error: { kind: 'unknown', message: result.error.message } };
    return {
      ok: true,
      value: { id: result.value._id, name: result.value.name, price: result.value.price },
    };
  }

  async findById(id: string): Promise<Result<Product | null, ProductRepositoryError>> {
    const result = await this.repo.findById(id);
    if (!result.ok) return { ok: false, error: { kind: 'unknown', message: result.error.message } };
    const doc = result.value;
    return {
      ok: true,
      value: doc === null ? null : { id: doc._id, name: doc.name, price: doc.price },
    };
  }
}
```

```typescript
// infrastructure/mongo/product-infra.module.ts — the only file that knows Nest exists
import { Module } from '@nestjs/common';
import { MongoModule, getConnectionToken } from '@wenu/nest-mongo';
import type { Db } from 'mongodb';

import { ProductMongoRepository } from './product-mongo.repository';

export const PRODUCT_REPOSITORY = 'PRODUCT_REPOSITORY';

@Module({
  imports: [MongoModule.forRoot({ uri: process.env.MONGO_URI ?? '', databaseName: 'shop' })],
  providers: [
    {
      provide: PRODUCT_REPOSITORY,
      useFactory: (db: Db) => new ProductMongoRepository(db),
      inject: [getConnectionToken()],
    },
  ],
  exports: [PRODUCT_REPOSITORY],
})
export class ProductInfraModule {}
```

`ProductMongoRepository` has zero `@nestjs/*` imports — it is the same class that would run under
Express, Koa, or a standalone script wired against a plain `MongoClient.connect()`. Only
`ProductInfraModule` differs per runtime; it is the seam where `@InjectConnection` /
`getConnectionToken()` bridges Nest's DI to the framework-agnostic adapter.
`getClientWrapperToken()` injects the `MongoClientWrapper` itself (`{ client, close }`) — reach for
it only when you need the raw `MongoClient` (e.g. custom shutdown coordination); for a
`DatabaseLike` handle, `getConnectionToken()` is the direct seam since it resolves straight to the
`Db` instance.

### Testing

Because `ProductMongoRepository` only depends on `@wenu/mongo`, testing it never needs Nest's
`TestingModule`.

**Unit — mocked driver, no Nest, no Docker:**

```typescript
const setup = () => {
  const db = { collection: () => fakeCollection };
  return { repo: new ProductMongoRepository(db) };
};
```

**Integration — real testcontainers, no Nest involved:**

```typescript
const repo = new ProductMongoRepository(client.db('test'));
const saved = await repo.save({ id: 'sku-1', name: 'Widget', price: 9.99 });
```

Testing the **domain/application layer** (use cases depending on the consumer's own
`ProductRepository` port) needs no MongoDB at all — a plain in-memory fake implementing the port is
enough.

### Rule: Nest decorators stay in the infrastructure module

`@InjectRepository`, `@InjectClientWrapper`, and any other `nest-mongo` decorator are valid **only
inside the infrastructure/wiring module** that constructs the adapter (`ProductInfraModule` above).
A use-case/application service (e.g. `ProductService`) must **never** inject
`Repository<Schema, Id>` from `@wenu/mongo` directly, and must never carry a `nest-mongo` decorator
— it receives its own `ProductRepository` port via plain Nest constructor injection instead (itself
framework-agnostic as a _pattern_ — every DI container has some form of constructor injection; it's
wiring, not a library-specific concept).

**The decorator boundary IS the infrastructure boundary.** Crossing it — injecting `@wenu/mongo`'s
`Repository` or a `nest-mongo` decorator into an application/use-case service — defeats the entire
point of writing a domain-owned port in the first place.

---

## Security

Like `@wenu/mongo`, repositories injected via `@wenu/nest-mongo` validate **documents**, not
**filters** or `updateRaw` operators — `Filter`/`UpdateFilter` arguments are forwarded to the driver
as-is. Never pass `req.query` or `req.body` directly as a filter or `updateRaw` update:

```typescript
// ❌ attacker-controlled operators reach the driver unchecked
await this.users.updateRaw({ _id: userId }, req.body.update);

// ✅ allow-list keys, build the update as code
await this.users.updateOne({ _id: userId }, { name: req.body.name });
```

See [`@wenu/mongo` — Security](../zod-mongo/README.md#security) for the full guidance, including the
`$where` server-side hardening option, and the repo-root [SECURITY.md](../../SECURITY.md) for the
vulnerability reporting policy.

---

## Acknowledgements

`@wenu/nest-mongo` builds on `@wenu/mongo` the same way
[`@ioni/nest-ts-valid-mongodb`](https://www.npmjs.com/package/@ioni/nest-ts-valid-mongodb) built on
`ts-valid-mongodb` — adding the NestJS layer: dynamic modules, `forRoot`/`forFeature`, typed
repository injection, and graceful shutdown. The evolution of the stack made it the natural home for
everything the original NestJS wrapper proved out.

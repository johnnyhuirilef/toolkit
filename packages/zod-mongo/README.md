# @wenu/mongo

Declarative, immutable, type-safe MongoDB repository layer with Zod validation. Zero throws. Dual
ESM/CJS. MongoDB 5/6/7 compatible. Zod 3 and 4 compatible.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [Defining a Collection](#defining-a-collection)
  - [Creating a Repository](#creating-a-repository)
  - [Result Type](#result-type)
- [CRUD Operations](#crud-operations)
- [Error Handling](#error-handling)
- [ID Strategies](#id-strategies)
- [Index Management](#index-management)
- [Aggregation](#aggregation)
- [Compatibility](#compatibility)
- [API Reference](#api-reference)

---

## Features

- **Zero throws** — every method returns `Result<T, DbError>`, never throws
- **Full type inference** — document shape, `_id` type, and filter types flow from a single
  `defineCollection()` call
- **Pluggable ID strategies** — `objectid` (default), `uuid`, `string`, or any Zod schema for custom
  types
- **Zod validation on write** — inserts and updates are validated before touching the database
- **Upsert with id strategy** — `upsertById` and `upsertOne` generate `_id` per strategy on
  insert-path; preserve existing `_id` on replace-path
- **Domain errors** — `NotFoundError`, `duplicate-key`, `validation` — no raw driver errors leaked
- **Immutable collection definitions** — `defineCollection()` returns a frozen, reusable descriptor
- **Index management** — declare indexes alongside the schema, sync or generate migrate-mongo
  scripts
- **Typed aggregation** — `aggregate()` accepts an output schema and returns `Result<Infer<Out>[]>`
- **Dual ESM/CJS** — works in Node ESM projects and CommonJS consumers alike

---

## Installation

```bash
# npm
npm install @wenu/mongo

# pnpm
pnpm add @wenu/mongo

# yarn
yarn add @wenu/mongo
```

### Peer dependencies

```bash
# MongoDB driver (choose one range)
npm install mongodb@^5   # or ^6 or ^7

# Zod (v3 or v4)
npm install zod@^3
```

**Requirements:** Node `>=18.0.0`

---

## Quick Start

```typescript
import * as z from 'zod';
import { MongoClient } from 'mongodb';
import { defineCollection, createRepository } from '@wenu/mongo';

// 1. Define the schema and collection
const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    createdAt: z.date(),
  }),
});

// 2. Connect and create the repository
const client = await MongoClient.connect('mongodb://localhost:27017');
const db = client.db('myapp');

const users = createRepository(UserCollection, db);

// 3. Use it — no throws, ever
const result = await users.insert({
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date(),
});

if (result.ok) {
  console.log(result.value._id); // ObjectId (inferred from id: 'objectid')
} else {
  console.error(result.error.kind, result.error.message);
}
```

---

## Core Concepts

### Defining a Collection

`defineCollection()` is the single source of truth for a collection's shape, ID strategy, and
indexes. It returns a frozen `CollectionDef` object you pass to `createRepository()` and index
utilities.

```typescript
import * as z from 'zod';
import { defineCollection, index } from '@wenu/mongo';

const ProductCollection = defineCollection({
  name: 'products',
  schema: z.object({
    sku: z.string(),
    name: z.string(),
    price: z.number().positive(),
    tags: z.array(z.string()).default([]),
  }),
  id: 'uuid', // optional — defaults to 'objectid'
  indexes: [index({ sku: 1 }, { unique: true }), index({ tags: 1 })],
});
```

The `Doc<Schema, Id>` type resolves to the schema output merged with the inferred `_id` type:

```typescript
import type { Doc } from '@wenu/mongo';

type Product = Doc<(typeof ProductCollection)['schema'], (typeof ProductCollection)['id']>;
// { _id: string; sku: string; name: string; price: number; tags: string[] }
```

### Creating a Repository

Pass the collection definition and a `Db` instance. The repository is a plain object — no classes,
no state beyond the driver handle.

```typescript
import { createRepository } from '@wenu/mongo';

const products = createRepository(ProductCollection, db);
```

All 12 methods return `Promise<Result<T, DbError>>`.

### Result Type

The `Result` type is a discriminated union — it never throws and forces you to handle both paths:

```typescript
type Ok<T> = { readonly ok: true; readonly value: T };
type Err<E> = { readonly ok: false; readonly error: E };
type Result<T, E = DbError> = Ok<T> | Err<E>;
```

Use the `ok` discriminant or the `isOk` / `isErr` type guards:

```typescript
import { isOk, isErr } from '@wenu/mongo';

const result = await users.findById(id);

// Discriminant
if (result.ok) {
  // result.value is Doc<...> | null
}

// Type guards
if (isOk(result)) {
  console.log(result.value);
}
if (isErr(result)) {
  console.error(result.error);
}
```

---

## CRUD Operations

All examples use the `users` repository from the Quick Start.

### Find

```typescript
// By ID
const byId = await users.findById(someObjectId);

// By filter — returns first match or null
const byEmail = await users.findOne({ email: 'alice@example.com' });

// All matching documents
const all = await users.find({ name: /alice/i });

// All documents (no filter)
const everyone = await users.find();
```

### Count and Exists

```typescript
// Count all documents
const total = await users.count();
if (total.ok) console.log(total.value); // number

// Count matching a filter
const admins = await users.count({ role: 'admin' });

// Check existence — cheaper than count (uses limit: 1 internally)
const hasAdmin = await users.exists({ role: 'admin' });
if (hasAdmin.ok) console.log(hasAdmin.value); // boolean
```

### Insert

```typescript
// Single document — validated before insert
const inserted = await users.insert({
  name: 'Bob',
  email: 'bob@example.com',
  createdAt: new Date(),
});

// Multiple documents — validates all first; any failure returns an error before any DB write
const many = await users.insertMany([
  { name: 'Carol', email: 'carol@example.com', createdAt: new Date() },
  { name: 'Dave', email: 'dave@example.com', createdAt: new Date() },
]);
```

### Upsert

`upsertById` always uses the caller-supplied `id` — on insert-path it becomes the document's `_id`.
`upsertOne` matches by filter — on insert-path it generates a new `_id` per the collection's id
strategy; on replace-path it preserves the existing `_id`.

```typescript
// Insert or replace by explicit ID (uuid strategy)
const result = await products.upsertById('sku-123', {
  sku: 'sku-123',
  name: 'Widget',
  price: 9.99,
  tags: [],
});
if (result.ok) {
  console.log(result.value._id); // 'sku-123'
}

// Insert or replace by filter — _id auto-generated on insert, preserved on replace
const bySlug = await products.upsertOne(
  { sku: 'sku-456' },
  { sku: 'sku-456', name: 'Gadget', price: 19.99, tags: ['new'] },
);
if (!bySlug.ok && bySlug.error.kind === 'not-found') {
  // driver returned null after write — extremely rare
}
```

### Update

```typescript
// By ID — returns updated document or null if not found
const updated = await users.updateById(someObjectId, { name: 'Alice Smith' });

// By filter — returns updated document or null
const updatedOne = await users.updateOne({ email: 'alice@example.com' }, { name: 'Alice Smith' });

// Bulk update — returns { modifiedCount }
const bulk = await users.updateMany(
  { createdAt: { $lt: new Date('2024-01-01') } },
  { name: 'archived' },
);
if (bulk.ok) {
  console.log(`Updated ${bulk.value.modifiedCount} documents`);
}
```

### Delete

```typescript
// By ID — returns deleted document or null
const deleted = await users.deleteById(someObjectId);

// By filter — returns deleted document or null
const deletedOne = await users.deleteOne({ email: 'bob@example.com' });

// Bulk delete — returns { deletedCount }
const bulk = await users.deleteMany({ createdAt: { $lt: cutoff } });
if (bulk.ok) {
  console.log(`Deleted ${bulk.value.deletedCount} documents`);
}
```

---

## Error Handling

`DbError` carries a discriminated `kind` field so you can branch on error type without inspecting
message strings:

```typescript
import type { DbError, DbErrorKind } from '@wenu/mongo';

type DbErrorKind =
  | 'validation' // Zod parse failed (insert/update input) — no DB call was made
  | 'duplicate-key' // MongoDB error code 11000 (unique index violation)
  | 'not-found' // upsert returned null after write (NotFoundError)
  | 'connection' // reserved for future use
  | 'unknown'; // any other driver error
```

```typescript
const result = await products.insert({ sku: 'existing-sku', name: 'X', price: 10, tags: [] });

if (!result.ok) {
  switch (result.error.kind) {
    case 'duplicate-key':
      throw new ConflictError('SKU already exists');
    case 'validation':
      throw new BadRequestError(result.error.message);
    default:
      throw new InternalError(result.error.message);
  }
}
```

You can also convert any caught value into a `DbError` using `toDbError`, or catch a specific domain
error class directly:

```typescript
import { toDbError, NotFoundError } from '@wenu/mongo';

const dbError = toDbError(caughtError);

// Catch domain errors directly
try {
  // ...
} catch (error) {
  if (error instanceof NotFoundError) {
    // kind: 'not-found'
  }
}
```

---

## ID Strategies

Set `id` in `defineCollection()`. The `_id` type on every document is inferred automatically.

### `objectid` (default)

Generated by the library using `new ObjectId()`. No `_id` in input data.

```typescript
import * as z from 'zod';
import { defineCollection, createRepository } from '@wenu/mongo';

const PostCollection = defineCollection({
  name: 'posts',
  schema: z.object({ title: z.string(), body: z.string() }),
  // id: 'objectid' is the default — can be omitted
});

const posts = createRepository(PostCollection, db);

const result = await posts.insert({ title: 'Hello', body: 'World' });
if (result.ok) {
  result.value._id; // ObjectId — auto-generated, never in input
}
```

### `uuid`

Generated using `crypto.randomUUID()`. No `_id` in input data. `_id` is always a UUID v4 string.

```typescript
const SessionCollection = defineCollection({
  name: 'sessions',
  schema: z.object({ userId: z.string(), expiresAt: z.date() }),
  id: 'uuid',
});

const sessions = createRepository(SessionCollection, db);

const result = await sessions.insert({ userId: 'u_123', expiresAt: new Date() });
if (result.ok) {
  result.value._id; // string — '3b4d5e6f-...' (UUID v4)
}

// upsertById uses the caller-supplied UUID as _id on insert-path
const upserted = await sessions.upsertById('my-session-id', {
  userId: 'u_123',
  expiresAt: new Date(),
});
if (upserted.ok) {
  upserted.value._id; // 'my-session-id'
}
```

### `string`

Caller-supplied string `_id`. Include `_id` in both the schema and the input data — the library does
not generate one.

```typescript
const CountryCollection = defineCollection({
  name: 'countries',
  schema: z.object({ _id: z.string(), name: z.string(), population: z.number() }),
  id: 'string',
});

const countries = createRepository(CountryCollection, db);

// _id must be in the data — no auto-generation
const result = await countries.insert({ _id: 'AR', name: 'Argentina', population: 46_000_000 });
if (result.ok) {
  result.value._id; // 'AR'
}

// upsertOne with string strategy — _id comes from data, not generated
await countries.upsertOne({ _id: 'AR' }, { _id: 'AR', name: 'Argentina', population: 46_500_000 });
```

### Custom Zod schema — branded type

Pass any Zod schema as the `id` value. The `_id` type is inferred from the schema output. Include
`_id` in the data — the library validates it through the schema.

```typescript
import * as z from 'zod';

const OrderId = z.string().brand<'OrderId'>();

const OrderCollection = defineCollection({
  name: 'orders',
  schema: z.object({ _id: OrderId, total: z.number(), status: z.string() }),
  id: OrderId,
});

const orders = createRepository(OrderCollection, db);

const id = 'order_123' as z.infer<typeof OrderId>;
const result = await orders.insert({ _id: id, total: 99.9, status: 'pending' });
if (result.ok) {
  result.value._id; // string & Brand<'OrderId'>
}
```

### Custom Zod schema — composite (multi-field) `_id`

Use a Zod object schema as `id` to get a composite `_id`. MongoDB treats the whole object as the
document identifier — uniqueness is enforced across the combination of all fields.

```typescript
import * as z from 'zod';

const TenantSlugId = z.object({ tenantId: z.string(), slug: z.string() });

const ArticleCollection = defineCollection({
  name: 'articles',
  schema: z.object({ _id: TenantSlugId, title: z.string() }),
  id: TenantSlugId,
});

const articles = createRepository(ArticleCollection, db);

// _id is validated and typed as { tenantId: string; slug: string }
const result = await articles.insert({
  _id: { tenantId: 'acme', slug: 'hello-world' },
  title: 'Hello World',
});
if (result.ok) {
  result.value._id; // { tenantId: string; slug: string }
}

// findById and upsertOne require the full _id object — dot notation ('_id.tenantId') does not match
const found = await articles.findById({ tenantId: 'acme', slug: 'hello-world' });

// annotate with z.infer so TypeScript resolves the filter type correctly
const compositeId: z.infer<typeof TenantSlugId> = { tenantId: 'acme', slug: 'hello-world' };
await articles.upsertOne({ _id: compositeId }, { _id: compositeId, title: 'Updated' });

// Invalid _id shape → kind: 'validation', no DB call made
const bad = await articles.insert({ _id: { tenantId: 'acme', slug: 123 as never }, title: 'Bad' });
if (!bad.ok) {
  bad.error.kind; // 'validation'
}
```

---

## Index Management

Declare indexes inside `defineCollection()` using the `index()` helper, then either sync them at
startup or generate a migrate-mongo migration file.

### Declaring indexes

```typescript
import { defineCollection, index } from '@wenu/mongo';

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

### Syncing at startup

`syncIndexes()` calls `createIndexes()` on the underlying collection and returns `Result<void>`.
Safe to call on every startup — MongoDB skips indexes that already exist.

```typescript
import { syncIndexes } from '@wenu/mongo';

const result = await syncIndexes(ArticleCollection, db);
if (!result.ok) {
  console.error('Index sync failed:', result.error.message);
}
```

### Generating a migrate-mongo script

```typescript
import { generateIndexMigration } from '@wenu/mongo';
import fs from 'node:fs';

const migration = generateIndexMigration(ArticleCollection);
fs.writeFileSync('migrations/20240101-articles-indexes.js', migration);
```

The generated file exports `up(db)` / `down(db)` compatible with
[migrate-mongo](https://github.com/seppevs/migrate-mongo).

---

## Aggregation

Pass the pipeline and an output schema. Results are parsed with the provided schema and returned as
`Result<Infer<Out>[]>`.

```typescript
import * as z from 'zod';

const SummarySchema = z.object({
  authorId: z.string(),
  articleCount: z.number(),
  latestPublishedAt: z.date().nullable(),
});

const result = await articles.aggregate(
  [
    { $match: { publishedAt: { $exists: true } } },
    {
      $group: {
        _id: '$authorId',
        articleCount: { $sum: 1 },
        latestPublishedAt: { $max: '$publishedAt' },
      },
    },
    { $project: { authorId: '$_id', articleCount: 1, latestPublishedAt: 1, _id: 0 } },
  ],
  SummarySchema,
);

if (result.ok) {
  for (const summary of result.value) {
    console.log(summary.authorId, summary.articleCount);
  }
}
```

---

## Compatibility

| Feature          | Supported                                   |
| ---------------- | ------------------------------------------- |
| Zod 3            | Yes                                         |
| Zod 4            | Yes (same `ZodCompat` API surface)          |
| MongoDB driver 5 | Yes (shim normalizes `ModifyResult.value`)  |
| MongoDB driver 6 | Yes (direct return from `findOneAndUpdate`) |
| MongoDB driver 7 | Yes                                         |
| Node.js          | `>=18.0.0`                                  |
| ESM              | Yes                                         |
| CJS              | Yes                                         |

---

## API Reference

### `defineCollection(config)`

Creates an immutable `CollectionDef` descriptor.

| Parameter        | Type         | Default      | Description                         |
| ---------------- | ------------ | ------------ | ----------------------------------- |
| `config.name`    | `string`     | —            | MongoDB collection name             |
| `config.schema`  | `ZodCompat`  | —            | Zod schema for the document body    |
| `config.id`      | `IdStrategy` | `'objectid'` | ID generation or inference strategy |
| `config.indexes` | `IndexDef[]` | `[]`         | Index definitions                   |

### `createRepository(collection, db)`

Returns a `Repository<Schema, Id>` bound to the collection definition and database. The `Repository`
contract is defined in `repository.ts`; the MongoDB implementation lives in `mongo-repository.ts`.

### `Repository<Schema, Id>` methods

| Method                              | Returns                                      |
| ----------------------------------- | -------------------------------------------- |
| `findById(id)`                      | `Promise<Result<Doc \| null>>`               |
| `findOne(filter)`                   | `Promise<Result<Doc \| null>>`               |
| `find(filter?)`                     | `Promise<Result<Doc[]>>`                     |
| `count(filter?)`                    | `Promise<Result<number>>`                    |
| `exists(filter)`                    | `Promise<Result<boolean>>`                   |
| `insert(data)`                      | `Promise<Result<Doc>>`                       |
| `insertMany(data)`                  | `Promise<Result<Doc[]>>`                     |
| `upsertById(id, data)`              | `Promise<Result<Doc>>`                       |
| `upsertOne(filter, data)`           | `Promise<Result<Doc>>`                       |
| `updateById(id, patch)`             | `Promise<Result<Doc \| null>>`               |
| `updateOne(filter, patch)`          | `Promise<Result<Doc \| null>>`               |
| `updateMany(filter, patch)`         | `Promise<Result<{ modifiedCount: number }>>` |
| `deleteById(id)`                    | `Promise<Result<Doc \| null>>`               |
| `deleteOne(filter)`                 | `Promise<Result<Doc \| null>>`               |
| `deleteMany(filter?)`               | `Promise<Result<{ deletedCount: number }>>`  |
| `aggregate(pipeline, outputSchema)` | `Promise<Result<Infer<Out>[]>>`              |

### `index(spec, options?)`

Creates an `IndexDef`. `spec` follows the MongoDB index key format (`{ field: 1 }`, `{ field: -1 }`,
etc.).

### `syncIndexes(collection, db)`

Syncs all declared indexes to MongoDB. Returns `Promise<Result<void>>`. Idempotent.

### `generateIndexMigration(collection)`

Returns a migrate-mongo compatible JS migration string (`up` / `down`) for the collection's indexes.

### Result helpers

| Export          | Signature                                | Description                        |
| --------------- | ---------------------------------------- | ---------------------------------- |
| `ok`            | `<T>(value: T) => Ok<T>`                 | Construct a success result         |
| `err`           | `<E>(error: E) => Err<E>`                | Construct an error result          |
| `isOk`          | `<T, E>(r: Result<T, E>) => r is Ok<T>`  | Type guard for success             |
| `isErr`         | `<T, E>(r: Result<T, E>) => r is Err<E>` | Type guard for error               |
| `toDbError`     | `(e: unknown) => DbError`                | Map any thrown value to `DbError`  |
| `NotFoundError` | `class extends Error`                    | Domain error → `kind: 'not-found'` |

### ID Strategies at a glance

| Strategy               | `_id` type      | Auto-generated              |
| ---------------------- | --------------- | --------------------------- |
| `'objectid'` (default) | `ObjectId`      | Yes — `new ObjectId()`      |
| `'uuid'`               | `string`        | Yes — `crypto.randomUUID()` |
| `'string'`             | `string`        | No — embed `_id` in data    |
| Any Zod schema         | `Infer<Schema>` | No — embed `_id` in data    |

---

## License

MIT

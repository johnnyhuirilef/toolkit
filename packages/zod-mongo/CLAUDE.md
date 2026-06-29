# CLAUDE.md — packages/zod-mongo

> Agent context for `@wenu/mongo`. Assumes the root `CLAUDE.md` has already been read.

## Package overview

Declarative, immutable, type-safe MongoDB repository layer. Zero throws, dual ESM/CJS output,
pluggable ID strategies.

Public surface: `defineCollection` + `createRepository` + `Result` + `DbError` +
`index`/`syncIndexes`/`generateIndexMigration` + `QueryBuilder` (type-only) + `Repository.session()`
(ClientSession threading).

Peer dependencies: `mongodb ^5 || ^6 || ^7`, `zod >=3 <5`. Runtime dependency: `radashi ^12`.

## Source map

```
src/
  index.ts          — re-exports only; no logic here
  collection.ts     — defineCollection(), CollectionDef<Schema, Id>, Doc<Schema, Id>
  repository.ts     — createRepository(), Repository<Schema, Id> interface
  result.ts         — Result<T, E>, Ok, Err, ok(), err(), isOk(), isErr()
  errors.ts         — DbError, DbErrorKind, toDbError()
  id.ts             — IdStrategy, InferIdType<T>, generateId()
  indexes.ts        — IndexDef, index(), syncIndexes(), generateIndexMigration()
  run-safe.ts       — runSafe() internal utility; wraps driver promises as Result<T>; moved out of mongo-repository.ts
  query-builder.ts  — QueryBuilder<Schema, Id> type + createQueryBuilder() factory; internal factory not re-exported
  compat/
    zod.ts          — ZodCompat structural type, Infer<T>
    driver.ts       — findOneAndModify() shim for MongoDB v5/v6/v7 API differences
tests/
  unit/             — Vitest unit tests, no Docker
  integration/      — Vitest + @testcontainers/mongodb (requires Docker)
  types/            — type-level inference tests
```

## Development commands

```bash
pnpm nx test zod-mongo               # unit + type tests (Vitest, no Docker)
pnpm nx test:integration zod-mongo   # integration tests (requires Docker)
pnpm nx typecheck zod-mongo          # tsc --build --emitDeclarationOnly
pnpm nx lint zod-mongo               # ESLint
pnpm nx build zod-mongo              # Rollup → dist/packages/zod-mongo (CJS + ESM)
```

Run a single test file:

```bash
cd packages/zod-mongo && pnpm vitest run tests/unit/collection.spec.ts
```

## Architecture invariants

### defineCollection

`defineCollection()` returns an `Object.freeze()`-d `CollectionDef`. Both the object and the
`indexes` array are frozen. Do not mutate. The `__doc` phantom field on `CollectionDef` carries the
`Doc<Schema, Id>` type for inference — it is never set at runtime.

### createRepository

Returns a plain object literal — not a class, not an instance. Every method is a closure over the
MongoDB collection handle. Do not add `this` references.

Accepts an internal third param `{ session?: ClientSession }` (defaults to `{}`). This param is NOT
in the public `Repository<Schema, Id>` type and is never re-exported. Use `repo.session(s)` to get a
new repository view that threads `s` into every driver call — the base repo is unaffected.

### Result type

All repository operations return `Promise<Result<T>>` where
`Result<T, E = DbError> = Ok<T> | Err<E>`. They never throw. Use `ok()` / `err()` constructors.
Discriminate with `.ok` boolean or `isOk()` / `isErr()` helpers.

The internal `toResult()` helper in `repository.ts` wraps driver promises via radashi `tryit`. This
is intentionally private — do not export it.

### toDbError

Maps any throwable to `DbError`. ZodError → `kind: 'validation'`, MongoDB duplicate-key (code 11000)
→ `kind: 'duplicate-key'`, other Error → `kind: 'unknown'`. Uses radashi `isError` and
`getErrorMessage`.

### ID strategies

`IdStrategy = 'objectid' | 'uuid' | 'string' | ZodCompat`

- `'objectid'` — `generateId` creates a new `ObjectId`; `_id` typed as `ObjectId`
- `'uuid'` — `generateId` creates `randomUUID()`; `_id` typed as `string`
- `'string'` — caller must embed `_id` in the data payload; auto-generation skipped
- `ZodCompat` schema — custom type, caller-supplied `_id`

`InferIdType<T>` flows through `CollectionDef` → `Doc<Schema, Id>` → `Repository` method signatures
end-to-end.

### MongoDB driver compat shim

`src/compat/driver.ts` exports `findOneAndModify()`. It handles the v5/v6/v7 API difference:

- v5: `findOneAndUpdate`/`findOneAndDelete` return `ModifyResult<T>` (`{ value: WithId<T> | null }`)
- v6/v7: return `WithId<T> | null` directly

`MONGO_MAJOR` is detected once at module load via `require('mongodb/package.json')`. It **cannot be
mocked in Vitest ESM**. Tests for this shim must test observable contract (what the function
returns), not which internal branch executed. Do not attempt to inject `MONGO_MAJOR`.

### Zod compat

`ZodCompat = { readonly _output: unknown; parse(data: unknown): unknown }` — structural, not
nominal. Works with Zod 3 and Zod 4 without importing from either. `Infer<T extends ZodCompat>`
extracts `T['_output']`.

`ZodCompat` does not expose `.partial()`. The `safePartialValidate` function in `repository.ts`
defensively probes for it at runtime. When adding schema-level features, check against `ZodCompat`,
not a concrete `ZodObject`.

## Code standards

### Imports

- `moduleResolution: nodenext` — all relative imports in `src/` use `.js` extension, even for `.ts`
  source files.
- Zod: always `import * as z from 'zod'`, never `import { z } from 'zod'`.

### Naming

- Interfaces: plain noun — `Repository`, `CollectionDef`, not `IRepository`, `ICollectionDef`
- Implementations with a technology identity: `MongoRepository` (not `RepositoryImpl`)
- Generic params: no `T` prefix — `Schema`, `Id`, not `TSchema`, `TId`. Single letter `T` is
  acceptable only for truly unconstrained params.

### ensure* / validate* contract

| Prefix      | Behaviour              | Return                        | Throws            |
| ----------- | ---------------------- | ----------------------------- | ----------------- |
| `ensure*`   | Guarantees a condition | `T`                           | appropriate error |
| `validate*` | Checks silently        | `value is T` (type predicate) | never             |

Do not mix.

### radashi usage

| Need                  | Use                  |
| --------------------- | -------------------- |
| Null/undefined check  | `isNullish(x)`       |
| Error check           | `isError(x)`         |
| Extract error message | `getErrorMessage(x)` |
| Empty collection      | `isEmpty(x)`         |
| Strip nullish keys    | `shake(obj)`         |
| Wrap throwing async   | `tryit(fn)`          |

Do NOT use `toResult`, `isResult`, `isResultOk`, or `isResultErr` from radashi — radashi's `Result`
is a `[error, value]` tuple, incompatible with the `{ ok, value/error }` object type used here.

### Comments

Only non-obvious WHY. Prefix internal constraint notes with `ponytail:` (existing convention in the
codebase). Never comment what the code does.

## Testing

### Test structure

Every test suite must define a `setup()` function that wires dependencies and returns SUT +
collaborators. For unit tests this is typically:

```ts
const setup = () => {
  const collection = defineCollection({ name: 'users', schema });
  return { collection };
};
```

Use fakes over mocks for repositories — Map-based classes implementing the real `Repository`
interface. Verify observable state, not method calls.

### Unit tests (no Docker)

Location: `tests/unit/`. Import directly from `../../src/*.js`.

`pnpm nx test zod-mongo` picks these up via the `include` glob in `vitest.config.mts`.

### Integration tests (requires Docker)

Location: `tests/integration/`. Use `@testcontainers/mongodb`. The container is started in
`beforeAll` with a 90s timeout; the hook timeout in `vitest.config.mts` is set to match.

```ts
beforeAll(async () => {
  container = await new MongoDBContainer('mongo:7').start();
  // ...
}, 90_000);
```

Integration tests are included in the same `pnpm nx test zod-mongo` run (same glob). The
`test:integration` target is the separate dedicated target if you need to run them in isolation.

### Type tests

Location: `tests/types/inference.spec.ts`. These test compile-time inference by asserting on
`typeof` and `ReturnType`. They run with the same command.

### Driver compat tests

`tests/unit/driver-compat.spec.ts` must test what `findOneAndModify` returns, not which internal
path ran. Do not mock `MONGO_MAJOR` — it is ESM-loaded at module init and cannot be intercepted in
Vitest.

## Build output

Rollup produces dual-format output to `dist/packages/zod-mongo/`:

- `index.cjs.js` — CommonJS
- `index.esm.js` — ESM
- `index.d.ts` — declarations

`mongodb` and `zod` are `external` — not bundled. `radashi` is bundled (runtime dep, not peer).

The `dist/packages/zod-mongo/package.json` is the one updated for releases (see
`manifestRootsToUpdate` in `project.json`).

## Gotchas

- `Doc<Schema, Id>` adds `_id: InferIdType<Id>` to `Infer<Schema>`. For `'string'` and custom
  `ZodCompat` strategies, the caller is responsible for including `_id` in the data; `buildDoc` does
  not generate one.
- `shake()` from radashi strips nullish keys from the patch before `$set`. Explicit `null` values in
  an update patch are therefore silently dropped.
- `aggregate()` takes an `outputSchema: Out` parameter and parses every output document through it.
  The schema does not have to match the collection's own schema.
- `syncIndexes` is a no-op when `collection.indexes` is empty (guarded by `isEmpty` from radashi).
- `generateIndexMigration` returns a migrate-mongo-compatible JS module string — it does not execute
  anything against a real database.

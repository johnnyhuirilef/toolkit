<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns
  for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task
  through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling
  directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`,
  `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have
  this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the
  `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge
  cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you
  already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look
  up generator syntax

<!-- nx configuration end-->

# Code Standards

## Zod import style

Always namespace-import Zod:

```ts
import * as z from 'zod'; // ✅
import { z } from 'zod'; // ❌
```

## Generic type parameters — no T prefix

Use descriptive names without decoration:

- `Repository<Schema, Id>` not `Repository<TSchema, TId>`
- `CollectionDef<Schema, Id>` not `CollectionDef<TSchema, TId>`
- Single letter (`T`) is acceptable only for truly unconstrained params (e.g. `ValueObject<T>`)
- Never `TEvent`, `TId`, `TInput`, `TSchema`

## ensure\* / validate\* naming convention

| Prefix      | Contract                               | Returns                       | Throws                |
| ----------- | -------------------------------------- | ----------------------------- | --------------------- |
| `ensure*`   | Guarantees a condition — fails loudly  | `T`                           | the appropriate error |
| `validate*` | Checks a condition — responds silently | `value is T` (type predicate) | never                 |

Never mix behaviors in one function.

## Naming: declarative over imperative

Name what things ARE, not what they DO:

- ✅ `MongoRepository`, `UuidIdStrategy`, `ZodCompatShim`
- ❌ `RepositoryImpl`, `IdStrategyAdapter`, `ZodCompatHelper`

Technology/mechanism as the identity. No adjectives like "durable", "resilient", "reliable".

## Fakes over mocks for repositories in tests

```ts
// ❌ mock — tests implementation, not behaviour
expect(mockRepo.save).toHaveBeenCalledWith(expect.anything());

// ✅ fake — verifies observable state
const saved = await repository.findById(id);
expect(saved?.name).toBe('Alice');
```

Fake structure: Map-based class implementing the real interface.

## Test setup pattern

Every test suite MUST have a `setup()` function that wires dependencies:

```ts
const setup = () => {
  const repo = new InMemoryUserRepository();
  const sut = createRepository(UserCollection, db);
  return { repo, sut };
};
```

## Code review — Conventional Comments format

Structure comments as:

```
<label> [(decorators)]: <subject>
[optional discussion]
```

Labels: `praise:`, `nitpick:`, `suggestion:`, `issue (blocking):`, `issue (non-blocking):`,
`question:`, `thought:`, `chore:`

## Seam discipline

- One adapter = hypothetical seam. Two adapters = real seam.
- Do not introduce ports/interfaces until there are at least two distinct implementors.
- The interface IS the test surface. If you need to test below the interface, the module shape is
  wrong.

## Comments — only non-obvious WHY

A comment adds value ONLY if it explains:

- A hidden constraint
- A subtle invariant
- A workaround for a specific bug
- Behaviour that would surprise a future reader

If removing it would not confuse anyone, do not write it. Never comment what the code does.

## radashi utilities

`radashi` is available in this workspace. Prefer its utilities over re-implementing:

| Situation                          | Use                  |
| ---------------------------------- | -------------------- |
| Check null or undefined            | `isNullish(x)`       |
| Check if value is an Error         | `isError(x)`         |
| Extract message from any throwable | `getErrorMessage(x)` |
| Check if collection is empty       | `isEmpty(x)`         |
| Remove nullish keys from object    | `shake(obj)`         |
| Wrap a throwing async call         | `tryit(fn)`          |

> **Note:** radashi's `Result` type is a tuple `[error, value]` — incompatible with our
> `Result<T, E>` object type. Do NOT use `toResult`, `isResult`, `isResultOk`, or `isResultErr` from
> radashi.

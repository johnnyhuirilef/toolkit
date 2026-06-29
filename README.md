# Ioni's Toolkit

Personal monorepo of TypeScript libraries for production-grade MongoDB applications.

Built with **Nx**, **pnpm**, and a strict no-throw, full-type-inference philosophy.

## 📦 Packages

| Package                                                         | Description                                                                                  | Version                                                                                                                       |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [`@wenu/mongo`](packages/zod-mongo)                             | Declarative, immutable, type-safe MongoDB repository layer with Zod validation. Zero throws. | [![npm](https://img.shields.io/npm/v/@wenu/mongo)](https://www.npmjs.com/package/@wenu/mongo)                                 |
| [`@wenu/nest-mongo`](packages/nest-zod-mongo)                   | NestJS dynamic module for `@wenu/mongo` — typed repository injection with graceful shutdown. | [![npm](https://img.shields.io/npm/v/@wenu/nest-mongo)](https://www.npmjs.com/package/@wenu/nest-mongo)                       |
| [`@ioni/nest-ts-valid-mongodb`](packages/nest-ts-valid-mongodb) | Legacy NestJS MongoDB wrapper with Zod validation (superseded by `@wenu/nest-mongo`).        | [![npm](https://img.shields.io/npm/v/@ioni/nest-ts-valid-mongodb)](https://www.npmjs.com/package/@ioni/nest-ts-valid-mongodb) |

> [!NOTE] `@ioni/nest-ts-valid-mongodb` is the original package and is no longer actively developed.
> New projects should use `@wenu/mongo` and `@wenu/nest-mongo`.

## 🛠️ Development

**Prerequisites:** Node.js `>=22.0.0`, pnpm `>=9`

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test:all

# Build all packages
pnpm build:all

# Lint all code
pnpm lint:all
```

This repository uses [Nx](https://nx.dev) for build orchestration. Prefer
`pnpm nx <target> <project>` for per-package work:

```bash
pnpm nx test zod-mongo
pnpm nx build nest-zod-mongo
pnpm nx lint zod-mongo
```

## 🚀 Release

Releases are managed with `nx release` and published to npm via GitHub Actions using OIDC Trusted
Publishers — no long-lived tokens required.

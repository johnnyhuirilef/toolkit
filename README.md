# Ioni's Toolkit

Personal monorepo for high-performance utilities, libraries, and architectural experiments.

Built with **Nx**, **TypeScript**, and a passion for solid software engineering.

## 📦 Packages

| Package                                                         | Description                                                   | Version                                                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [`@ioni/nest-ts-valid-mongodb`](packages/nest-ts-valid-mongodb) | MongoDB Native Driver wrapper for NestJS with Zod validation. | [![npm](https://img.shields.io/npm/v/@ioni/nest-ts-valid-mongodb)](https://www.npmjs.com/package/@ioni/nest-ts-valid-mongodb) |

## 🛠️ Development

This repository uses [Nx](https://nx.dev) for build system and monorepo management.

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Common Tasks

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

## 🏗️ Architecture

- **Strict TypeScript:** No `any` allowed (unless absolutely necessary and justified).
- **Zod Validation:** Runtime type safety is non-negotiable.
- **Dependency Injection:** Leveraging NestJS architecture for modularity.
- **Automated CI/CD:** GitHub Actions + Release Please for semantic versioning and publishing.

## 📄 License

MIT © [Ioni](https://github.com/johnnyhuirilef)

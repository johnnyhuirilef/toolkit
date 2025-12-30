# Basic Example - NestJS + TS Valid MongoDB

This is a basic example application demonstrating how to use `@ioni/nest-ts-valid-mongodb` with a standard NestJS application.

## Prerequisites

- Node.js (v18+)
- Docker & Docker Compose (for MongoDB)
- pnpm

## Setup

1. **Install dependencies** (from the root of the monorepo):

   ```bash
   pnpm install
   ```

2. **Start MongoDB infrastructure**:

   ```bash
   # From packages/nest-ts-valid-mongodb/examples/basic
   docker compose up -d
   ```

   This starts:
   - MongoDB on port `27017`
   - Mongo Express on port `8081` (http://localhost:8081)

## Running the app

```bash
# From packages/nest-ts-valid-mongodb/examples/basic
pnpm run start:dev
```

The application will start on `http://localhost:3000`.

## API Endpoints

You can test the API using curl or any HTTP client.

### Create User

```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Johnny", "email": "johnny@example.com", "age": 30}'
```

### Get All Users

```bash
curl http://localhost:3000/users
```

### Get One User

```bash
curl http://localhost:3000/users/<ID>
```

## Features Demonstrated

- **Module Registration**: `TsValidMongoModule.forRoot` in `AppModule`.
- **Feature Registration**: `TsValidMongoModule.forFeature` in `UsersModule`.
- **Zod Schema**: Definition and validation using standard Zod schemas.
- **Dependency Injection**: Using `@InjectModel` to inject the typed model into `UsersService`.
- **Type Safety**: Full TypeScript support for CRUD operations based on the Zod schema.

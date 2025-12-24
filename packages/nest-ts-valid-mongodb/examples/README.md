# Examples

This directory contains practical examples demonstrating how to use `@ioni/nest-ts-valid-mongodb` in
real-world scenarios.

## 📁 Available Examples

### 🟢 [Basic](./basic/) - Quick Start

A minimal, working example showing the fundamental setup and usage.

**What you'll learn:**

- Setting up the module with `forRoot()`
- Defining Zod schemas
- Creating and injecting models
- Basic CRUD operations
- Simple service and controller

**Best for:** First-time users or quick prototypes

---

### 🔴 [Advanced](./advanced/) - Production-Ready Patterns

A comprehensive example demonstrating advanced features and best practices.

**What you'll learn:**

- Async configuration with `ConfigService`
- Multiple database connections
- Custom indexes and schema options
- Error handling with custom exceptions
- Transactions
- Connection health checks
- Repository pattern
- Testing strategies

**Best for:** Production applications

---

## 🚀 Running the Examples

Each example is a self-contained NestJS application. To run them:

### Option 1: Run Locally

```bash
# Navigate to the example
cd basic  # or cd advanced

# Install dependencies
npm install

# Set up environment variables (create .env file)
cp .env.example .env

# Run the application
npm run start:dev
```

### Option 2: Use Docker (Advanced Example Only)

```bash
cd advanced
docker-compose up
```

---

## 📚 What Each Example Demonstrates

### Basic Example Structure

```
basic/
├── src/
│   ├── app.module.ts          # Module setup
│   ├── users/
│   │   ├── users.module.ts    # Feature module
│   │   ├── users.service.ts   # Service with CRUD
│   │   ├── users.controller.ts # REST endpoints
│   │   └── user.schema.ts     # Zod schema
│   └── main.ts
├── package.json
└── README.md
```

### Advanced Example Structure

```
advanced/
├── src/
│   ├── config/
│   │   └── database.config.ts # Centralized config
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.repository.ts # Repository pattern
│   │   ├── users.service.ts
│   │   └── user.schema.ts
│   ├── analytics/
│   │   └── ...                # Second database
│   ├── health/
│   │   └── health.controller.ts # Health checks
│   └── main.ts
├── test/
│   └── users.e2e-spec.ts      # E2E tests
├── docker-compose.yml
├── package.json
└── README.md
```

---

## 💡 Tips

- **Start with Basic**: Understand the fundamentals before diving into advanced patterns
- **Copy & Adapt**: These examples are designed to be copied and modified for your needs
- **Environment Variables**: Never commit `.env` files with real credentials
- **Production Ready**: The Advanced example follows production best practices

---

## 🤝 Contributing Examples

Have a cool use case? Want to add an example? Check out our
[Contributing Guide](../../../CONTRIBUTING.md).

---

## 📖 Additional Resources

- [Main Documentation](../README.md)
- [API Reference](../README.md#-api-reference)
- [Error Handling](../README.md#-error-handling)

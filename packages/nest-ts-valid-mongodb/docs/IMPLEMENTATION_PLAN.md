# Plan de Implementación - Graceful Shutdown

**Estrategia:** Commits atómicos con Conventional Commits
**Principios:** Declarativo, Clause Guards, Early Returns, SOLID, Baja Complejidad Ciclomática

---

## 🎯 Estructura de Commits

Cada commit debe:
- ✅ Ser atómico (una responsabilidad)
- ✅ Pasar los tests (CI green)
- ✅ Seguir Conventional Commits
- ✅ Solo título (sin co-author)
- ✅ Código declarativo con early returns

---

## 📦 FASE 1: Fundamentos y Type Safety

### Objetivo
Establecer base sólida con tipos correctos y validaciones antes de implementar lógica compleja.

---

### Commit 1.1
```
feat(types): add shutdown configuration types
```

**Archivos:**
- `src/lib/interfaces/index.ts`

**Cambios:**
```typescript
// Nuevo tipo para configuración de shutdown
export type ShutdownOptions = {
  readonly timeout: number;
  readonly forceClose: boolean;
};

export type TsValidMongoConnectionOptionsBase = {
  // ... campos existentes
  readonly shutdownTimeout?: number;
  readonly forceShutdown?: boolean;
};
```

**Principios aplicados:**
- ✅ Single Responsibility (solo definición de tipos)
- ✅ Readonly para inmutabilidad
- ✅ Nombres declarativos

**Tests:** N/A (solo tipos)

---

### Commit 1.2
```
feat(guards): add type guard for connection wrapper validation
```

**Archivos:**
- `src/lib/core/guards.ts` (nuevo)

**Cambios:**
```typescript
import type { MongoDbClientWrapper } from './client';

export const isValidConnectionWrapper = (
  value: unknown
): value is MongoDbClientWrapper => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value !== 'object') {
    return false;
  }

  if (!('close' in value)) {
    return false;
  }

  if (typeof value.close !== 'function') {
    return false;
  }

  return true;
};

export const isConnectionToken = (
  token: unknown
): token is string | symbol => {
  return typeof token === 'string' || typeof token === 'symbol';
};
```

**Principios aplicados:**
- ✅ Early returns (cada validación retorna inmediatamente)
- ✅ Declarativo (describe QUÉ validar, no CÓMO)
- ✅ Pure functions
- ✅ Complejidad ciclomática: 2 (muy baja)

**Tests:**
```typescript
// tests/unit/guards.spec.ts
describe('isValidConnectionWrapper', () => {
  it('returns false for null', () => {
    expect(isValidConnectionWrapper(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidConnectionWrapper(undefined)).toBe(false);
  });

  it('returns false for primitives', () => {
    expect(isValidConnectionWrapper(42)).toBe(false);
    expect(isValidConnectionWrapper('string')).toBe(false);
  });

  it('returns false for object without close method', () => {
    expect(isValidConnectionWrapper({})).toBe(false);
  });

  it('returns true for valid wrapper', () => {
    const wrapper = { close: () => Promise.resolve() };
    expect(isValidConnectionWrapper(wrapper)).toBe(true);
  });
});
```

---

### Commit 1.3
```
feat(constants): add default shutdown configuration constants
```

**Archivos:**
- `src/lib/constants/shutdown.ts` (nuevo)

**Cambios:**
```typescript
export const SHUTDOWN_DEFAULTS = {
  TIMEOUT_MS: 10000,
  FORCE_CLOSE: false,
  RETRY_ATTEMPTS: 2,
  RETRY_DELAY_MS: 100,
} as const;

export const SHUTDOWN_EVENTS = {
  START: 'shutdown.start',
  COMPLETE: 'shutdown.complete',
  ERROR: 'shutdown.error',
  TIMEOUT: 'shutdown.timeout',
  CONNECTION_CLOSED: 'connection.closed',
  CONNECTION_FAILED: 'connection.close.failed',
} as const;
```

**Principios aplicados:**
- ✅ Don't Repeat Yourself (centraliza magic numbers)
- ✅ `as const` para type safety
- ✅ UPPER_CASE para constantes
- ✅ Namespace por categoría (SHUTDOWN_*)

**Tests:** N/A (solo constantes)

---

### Commit 1.4
```
test(helpers): add test helpers for shutdown scenarios
```

**Archivos:**
- `tests/setup/shutdown-helpers.ts` (nuevo)

**Cambios:**
```typescript
import { vi } from 'vitest';
import type { MongoDbClientWrapper } from '../../src/lib/core/client';

export const createMockWrapper = (
  overrides?: Partial<MongoDbClientWrapper>
): MongoDbClientWrapper => ({
  client: {} as any,
  close: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

export const createHangingWrapper = (): MongoDbClientWrapper => ({
  client: {} as any,
  close: vi.fn().mockImplementation(
    () => new Promise(() => {}) // Never resolves
  ),
});

export const createFailingWrapper = (
  error: Error = new Error('Connection close failed')
): MongoDbClientWrapper => ({
  client: {} as any,
  close: vi.fn().mockRejectedValue(error),
});

export const waitForTime = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));
```

**Principios aplicados:**
- ✅ Factory functions declarativas
- ✅ Default parameters
- ✅ Nombres descriptivos (createHangingWrapper)
- ✅ Cada función tiene una responsabilidad

**Tests:** N/A (son helpers para otros tests)

---

## 📦 FASE 2: Shutdown Core Logic

### Objetivo
Implementar lógica de cierre con timeout, retry, y manejo de errores.

---

### Commit 2.1
```
feat(shutdown): add timeout wrapper utility
```

**Archivos:**
- `src/lib/core/shutdown/timeout.ts` (nuevo)

**Cambios:**
```typescript
import { SHUTDOWN_DEFAULTS } from '../../constants/shutdown';

type TimeoutConfig = {
  readonly timeoutMs: number;
  readonly operation: string;
};

export class ShutdownTimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} exceeded timeout of ${timeoutMs}ms`);
    this.name = 'ShutdownTimeoutError';
  }
}

export const withTimeout = <T>(
  promise: Promise<T>,
  config: TimeoutConfig
): Promise<T> => {
  const { timeoutMs, operation } = config;

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new ShutdownTimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

export const getShutdownTimeout = (
  userTimeout?: number
): number => {
  if (userTimeout === undefined) {
    return SHUTDOWN_DEFAULTS.TIMEOUT_MS;
  }

  if (userTimeout < 0) {
    return SHUTDOWN_DEFAULTS.TIMEOUT_MS;
  }

  return userTimeout;
};
```

**Principios aplicados:**
- ✅ Early return en validaciones
- ✅ Declarativo (withTimeout describe QUÉ hacer)
- ✅ Custom error con contexto
- ✅ Readonly config
- ✅ Pure functions
- ✅ Complejidad ciclomática: 2

**Tests:**
```typescript
// tests/unit/shutdown/timeout.spec.ts
describe('withTimeout', () => {
  it('resolves if promise completes before timeout', async () => {
    const promise = Promise.resolve(42);
    const result = await withTimeout(promise, {
      timeoutMs: 1000,
      operation: 'test',
    });
    expect(result).toBe(42);
  });

  it('rejects with ShutdownTimeoutError if timeout exceeded', async () => {
    const promise = new Promise(() => {}); // Never resolves
    await expect(
      withTimeout(promise, {
        timeoutMs: 100,
        operation: 'test operation',
      })
    ).rejects.toThrow('test operation exceeded timeout of 100ms');
  });
});

describe('getShutdownTimeout', () => {
  it('returns default when undefined', () => {
    expect(getShutdownTimeout()).toBe(10000);
  });

  it('returns default when negative', () => {
    expect(getShutdownTimeout(-1)).toBe(10000);
  });

  it('returns user value when valid', () => {
    expect(getShutdownTimeout(5000)).toBe(5000);
  });
});
```

---

### Commit 2.2
```
feat(shutdown): add retry utility for connection close
```

**Archivos:**
- `src/lib/core/shutdown/retry.ts` (nuevo)

**Cambios:**
```typescript
import { SHUTDOWN_DEFAULTS } from '../../constants/shutdown';

type RetryConfig = {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly operation: string;
};

type RetryResult<T> = {
  readonly success: boolean;
  readonly value?: T;
  readonly error?: Error;
  readonly attempts: number;
};

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const calculateBackoff = (attempt: number, baseDelayMs: number): number =>
  baseDelayMs * Math.pow(2, attempt);

export const withRetry = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<RetryResult<T>> => {
  const { maxAttempts, delayMs, operation: operationName } = config;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const value = await operation();
      return {
        success: true,
        value,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = error instanceof Error
        ? error
        : new Error(String(error));

      const isLastAttempt = attempt === maxAttempts - 1;

      if (isLastAttempt) {
        break;
      }

      const backoffMs = calculateBackoff(attempt, delayMs);
      await delay(backoffMs);
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: maxAttempts,
  };
};

export const getRetryConfig = (
  userRetries?: number
): Pick<RetryConfig, 'maxAttempts' | 'delayMs'> => ({
  maxAttempts: userRetries ?? SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS,
  delayMs: SHUTDOWN_DEFAULTS.RETRY_DELAY_MS,
});
```

**Principios aplicados:**
- ✅ Early break (isLastAttempt)
- ✅ Pure helper functions (calculateBackoff, delay)
- ✅ Declarativo (withRetry describe estrategia)
- ✅ Retorna resultado en vez de throw (más funcional)
- ✅ Readonly en tipos
- ✅ Complejidad ciclomática: 3

**Tests:**
```typescript
// tests/unit/shutdown/retry.spec.ts
describe('withRetry', () => {
  it('succeeds on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue(42);
    const result = await withRetry(operation, {
      maxAttempts: 3,
      delayMs: 10,
      operation: 'test',
    });

    expect(result.success).toBe(true);
    expect(result.value).toBe(42);
    expect(result.attempts).toBe(1);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and eventually succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue(42);

    const result = await withRetry(operation, {
      maxAttempts: 3,
      delayMs: 10,
      operation: 'test',
    });

    expect(result.success).toBe(true);
    expect(result.value).toBe(42);
    expect(result.attempts).toBe(3);
  });

  it('returns failure after max attempts', async () => {
    const error = new Error('Persistent failure');
    const operation = vi.fn().mockRejectedValue(error);

    const result = await withRetry(operation, {
      maxAttempts: 2,
      delayMs: 10,
      operation: 'test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toEqual(error);
    expect(result.attempts).toBe(2);
  });
});
```

---

### Commit 2.3
```
feat(shutdown): add structured logger for shutdown events
```

**Archivos:**
- `src/lib/core/shutdown/logger.ts` (nuevo)

**Cambios:**
```typescript
import { Logger } from '@nestjs/common';
import { SHUTDOWN_EVENTS } from '../../constants/shutdown';

type LogContext = {
  readonly event: string;
  readonly [key: string]: unknown;
};

type ConnectionCloseContext = {
  readonly token: string;
  readonly duration?: number;
  readonly error?: string;
  readonly stack?: string;
};

const LOGGER_CONTEXT = 'TsValidMongoModule';

const formatContext = (context: LogContext): string =>
  JSON.stringify(context, null, 2);

export const logShutdownStart = (connectionCount: number): void => {
  Logger.log(
    formatContext({
      event: SHUTDOWN_EVENTS.START,
      connectionCount,
      timestamp: new Date().toISOString(),
    }),
    LOGGER_CONTEXT
  );
};

export const logShutdownComplete = (
  totalConnections: number,
  successCount: number,
  failureCount: number,
  durationMs: number
): void => {
  Logger.log(
    formatContext({
      event: SHUTDOWN_EVENTS.COMPLETE,
      totalConnections,
      successCount,
      failureCount,
      durationMs,
      timestamp: new Date().toISOString(),
    }),
    LOGGER_CONTEXT
  );
};

export const logConnectionClosed = (
  token: string,
  durationMs: number
): void => {
  Logger.log(
    formatContext({
      event: SHUTDOWN_EVENTS.CONNECTION_CLOSED,
      token,
      durationMs,
      timestamp: new Date().toISOString(),
    }),
    LOGGER_CONTEXT
  );
};

export const logConnectionFailed = (
  context: ConnectionCloseContext
): void => {
  Logger.error(
    formatContext({
      event: SHUTDOWN_EVENTS.CONNECTION_FAILED,
      ...context,
      timestamp: new Date().toISOString(),
    }),
    LOGGER_CONTEXT
  );
};

export const logShutdownTimeout = (timeoutMs: number): void => {
  Logger.error(
    formatContext({
      event: SHUTDOWN_EVENTS.TIMEOUT,
      timeoutMs,
      timestamp: new Date().toISOString(),
    }),
    LOGGER_CONTEXT
  );
};
```

**Principios aplicados:**
- ✅ Single Responsibility (cada función logea un tipo de evento)
- ✅ Declarativo (nombres descriptivos)
- ✅ Pure function helper (formatContext)
- ✅ Readonly parameters
- ✅ Structured logging (JSON)
- ✅ Complejidad ciclomática: 1 (por función)

**Tests:**
```typescript
// tests/unit/shutdown/logger.spec.ts
import { Logger } from '@nestjs/common';
import { vi } from 'vitest';

vi.mock('@nestjs/common', () => ({
  Logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Shutdown Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs shutdown start with connection count', () => {
    logShutdownStart(5);

    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('"event":"shutdown.start"'),
      'TsValidMongoModule'
    );
    expect(Logger.log).toHaveBeenCalledWith(
      expect.stringContaining('"connectionCount":5'),
      'TsValidMongoModule'
    );
  });

  it('logs connection failure with error details', () => {
    logConnectionFailed({
      token: 'test-token',
      error: 'Network error',
      stack: 'Error stack trace',
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining('"event":"connection.close.failed"'),
      'TsValidMongoModule'
    );
  });
});
```

---

### Commit 2.4
```
feat(shutdown): add connection close orchestrator
```

**Archivos:**
- `src/lib/core/shutdown/orchestrator.ts` (nuevo)

**Cambios:**
```typescript
import type { ModuleRef } from '@nestjs/core';
import type { MongoDbClientWrapper } from '../client';
import { isValidConnectionWrapper } from '../guards';
import { withTimeout } from './timeout';
import { withRetry } from './retry';
import {
  logConnectionClosed,
  logConnectionFailed,
} from './logger';

type CloseConnectionConfig = {
  readonly token: string | symbol;
  readonly moduleRef: ModuleRef;
  readonly timeoutMs: number;
  readonly retryAttempts: number;
};

type CloseResult = {
  readonly token: string | symbol;
  readonly success: boolean;
  readonly durationMs: number;
  readonly error?: Error;
};

const getWrapper = (
  token: string | symbol,
  moduleRef: ModuleRef
): MongoDbClientWrapper | null => {
  try {
    const wrapper = moduleRef.get<MongoDbClientWrapper>(token);

    if (!isValidConnectionWrapper(wrapper)) {
      return null;
    }

    return wrapper;
  } catch {
    return null;
  }
};

const closeWithRetry = async (
  wrapper: MongoDbClientWrapper,
  retryAttempts: number
): Promise<{ success: boolean; error?: Error }> => {
  const result = await withRetry(
    () => wrapper.close(),
    {
      maxAttempts: retryAttempts,
      delayMs: 100,
      operation: 'connection.close',
    }
  );

  return {
    success: result.success,
    error: result.error,
  };
};

export const closeConnection = async (
  config: CloseConnectionConfig
): Promise<CloseResult> => {
  const { token, moduleRef, timeoutMs, retryAttempts } = config;
  const startTime = Date.now();
  const tokenString = String(token);

  const wrapper = getWrapper(token, moduleRef);

  if (wrapper === null) {
    return {
      token,
      success: false,
      durationMs: 0,
      error: new Error('Invalid or missing wrapper'),
    };
  }

  try {
    const closeOperation = closeWithRetry(wrapper, retryAttempts);
    const result = await withTimeout(closeOperation, {
      timeoutMs,
      operation: `close connection ${tokenString}`,
    });

    const durationMs = Date.now() - startTime;

    if (result.success) {
      logConnectionClosed(tokenString, durationMs);
      return { token, success: true, durationMs };
    }

    logConnectionFailed({
      token: tokenString,
      error: result.error?.message,
      stack: result.error?.stack,
    });

    return {
      token,
      success: false,
      durationMs,
      error: result.error,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorObj = error instanceof Error ? error : new Error(String(error));

    logConnectionFailed({
      token: tokenString,
      duration: durationMs,
      error: errorObj.message,
      stack: errorObj.stack,
    });

    return {
      token,
      success: false,
      durationMs,
      error: errorObj,
    };
  }
};

export const closeAllConnections = async (
  tokens: (string | symbol)[],
  moduleRef: ModuleRef,
  timeoutMs: number,
  retryAttempts: number
): Promise<CloseResult[]> => {
  const closePromises = tokens.map(token =>
    closeConnection({
      token,
      moduleRef,
      timeoutMs,
      retryAttempts,
    })
  );

  return Promise.all(closePromises);
};
```

**Principios aplicados:**
- ✅ Single Responsibility (cada función tiene un propósito claro)
- ✅ Early return (getWrapper retorna null inmediatamente)
- ✅ Declarativo (closeConnection describe el flujo)
- ✅ Composition (combina withTimeout + withRetry)
- ✅ Error handling con try/catch específico
- ✅ Readonly config
- ✅ Complejidad ciclomática: 3-4 (aceptable)

**Tests:**
```typescript
// tests/unit/shutdown/orchestrator.spec.ts
import { ModuleRef } from '@nestjs/core';
import { createMockWrapper, createFailingWrapper } from '../../setup/shutdown-helpers';

describe('closeConnection', () => {
  let moduleRef: ModuleRef;

  beforeEach(() => {
    moduleRef = {
      get: vi.fn(),
    } as unknown as ModuleRef;
  });

  it('closes connection successfully', async () => {
    const mockWrapper = createMockWrapper();
    vi.mocked(moduleRef.get).mockReturnValue(mockWrapper);

    const result = await closeConnection({
      token: 'test-token',
      moduleRef,
      timeoutMs: 5000,
      retryAttempts: 2,
    });

    expect(result.success).toBe(true);
    expect(mockWrapper.close).toHaveBeenCalled();
  });

  it('returns failure when wrapper is invalid', async () => {
    vi.mocked(moduleRef.get).mockReturnValue(null);

    const result = await closeConnection({
      token: 'test-token',
      moduleRef,
      timeoutMs: 5000,
      retryAttempts: 2,
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Invalid or missing wrapper');
  });

  it('handles close errors', async () => {
    const error = new Error('Connection error');
    const mockWrapper = createFailingWrapper(error);
    vi.mocked(moduleRef.get).mockReturnValue(mockWrapper);

    const result = await closeConnection({
      token: 'test-token',
      moduleRef,
      timeoutMs: 5000,
      retryAttempts: 2,
    });

    expect(result.success).toBe(false);
    expect(result.error).toEqual(error);
  });
});
```

---

## 📦 FASE 3: Integration con Module

### Objetivo
Integrar la lógica de shutdown en el módulo principal manteniendo backward compatibility.

---

### Commit 3.1
```
refactor(module): extract shutdown configuration resolver
```

**Archivos:**
- `src/lib/core/shutdown/config.ts` (nuevo)

**Cambios:**
```typescript
import { SHUTDOWN_DEFAULTS } from '../../constants/shutdown';
import type { TsValidMongoConnectionOptions } from '../../interfaces';

export type ShutdownConfig = {
  readonly timeoutMs: number;
  readonly retryAttempts: number;
  readonly forceClose: boolean;
};

const isValidTimeout = (value: unknown): value is number =>
  typeof value === 'number' && value > 0;

const isValidRetries = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0;

export const resolveShutdownConfig = (
  options?: TsValidMongoConnectionOptions
): ShutdownConfig => {
  const userTimeout = options?.shutdownTimeout;
  const timeoutMs = isValidTimeout(userTimeout)
    ? userTimeout
    : SHUTDOWN_DEFAULTS.TIMEOUT_MS;

  const retryAttempts = SHUTDOWN_DEFAULTS.RETRY_ATTEMPTS;
  const forceClose = SHUTDOWN_DEFAULTS.FORCE_CLOSE;

  return {
    timeoutMs,
    retryAttempts,
    forceClose,
  };
};
```

**Principios aplicados:**
- ✅ Single Responsibility (solo resolver config)
- ✅ Pure function
- ✅ Type guards específicos
- ✅ Early return en validaciones
- ✅ Defaults centralizados
- ✅ Complejidad ciclomática: 2

**Tests:**
```typescript
describe('resolveShutdownConfig', () => {
  it('returns defaults when no options provided', () => {
    const config = resolveShutdownConfig();
    expect(config.timeoutMs).toBe(10000);
  });

  it('uses user timeout when valid', () => {
    const config = resolveShutdownConfig({
      shutdownTimeout: 5000,
      databaseName: 'test',
      uri: 'mongodb://localhost',
    });
    expect(config.timeoutMs).toBe(5000);
  });

  it('uses default when timeout is invalid', () => {
    const config = resolveShutdownConfig({
      shutdownTimeout: -1,
      databaseName: 'test',
      uri: 'mongodb://localhost',
    });
    expect(config.timeoutMs).toBe(10000);
  });
});
```

---

### Commit 3.2
```
refactor(module): extract onModuleDestroy to dedicated service
```

**Archivos:**
- `src/lib/core/shutdown/service.ts` (nuevo)

**Cambios:**
```typescript
import type { ModuleRef } from '@nestjs/core';
import { closeAllConnections } from './orchestrator';
import {
  logShutdownStart,
  logShutdownComplete,
  logShutdownTimeout,
} from './logger';
import type { ShutdownConfig } from './config';
import { withTimeout, ShutdownTimeoutError } from './timeout';

type ShutdownServiceConfig = {
  readonly tokens: (string | symbol)[];
  readonly moduleRef: ModuleRef;
  readonly shutdownConfig: ShutdownConfig;
};

type ShutdownSummary = {
  readonly totalConnections: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly durationMs: number;
};

const countResults = (
  results: Array<{ success: boolean }>
): { success: number; failure: number } => {
  const success = results.filter(r => r.success).length;
  const failure = results.length - success;
  return { success, failure };
};

export const executeShutdown = async (
  config: ShutdownServiceConfig
): Promise<ShutdownSummary> => {
  const { tokens, moduleRef, shutdownConfig } = config;
  const startTime = Date.now();

  if (tokens.length === 0) {
    return {
      totalConnections: 0,
      successCount: 0,
      failureCount: 0,
      durationMs: 0,
    };
  }

  logShutdownStart(tokens.length);

  try {
    const closeOperation = closeAllConnections(
      tokens,
      moduleRef,
      shutdownConfig.timeoutMs,
      shutdownConfig.retryAttempts
    );

    const results = await withTimeout(closeOperation, {
      timeoutMs: shutdownConfig.timeoutMs,
      operation: 'shutdown',
    });

    const durationMs = Date.now() - startTime;
    const { success, failure } = countResults(results);

    logShutdownComplete(tokens.length, success, failure, durationMs);

    return {
      totalConnections: tokens.length,
      successCount: success,
      failureCount: failure,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    if (error instanceof ShutdownTimeoutError) {
      logShutdownTimeout(shutdownConfig.timeoutMs);
    }

    // Return partial results
    return {
      totalConnections: tokens.length,
      successCount: 0,
      failureCount: tokens.length,
      durationMs,
    };
  }
};
```

**Principios aplicados:**
- ✅ Single Responsibility (solo lógica de shutdown)
- ✅ Early return (tokens vacíos)
- ✅ Pure helper (countResults)
- ✅ Declarativo (executeShutdown describe el proceso)
- ✅ Error handling específico
- ✅ Complejidad ciclomática: 3

**Tests:**
```typescript
describe('executeShutdown', () => {
  it('returns zero counts when no tokens', async () => {
    const summary = await executeShutdown({
      tokens: [],
      moduleRef: {} as ModuleRef,
      shutdownConfig: {
        timeoutMs: 5000,
        retryAttempts: 2,
        forceClose: false,
      },
    });

    expect(summary.totalConnections).toBe(0);
    expect(summary.successCount).toBe(0);
  });

  // More tests...
});
```

---

### Commit 3.3
```
refactor(module): integrate shutdown service into TsValidMongoModule
```

**Archivos:**
- `src/lib/core/module.ts`

**Cambios:**
```typescript
import { executeShutdown } from './shutdown/service';
import { resolveShutdownConfig } from './shutdown/config';

@Global()
@Module({})
export class TsValidMongoModule implements OnModuleDestroy {
  private shutdownConfig: ShutdownConfig;

  constructor(
    private readonly moduleRef: ModuleRef,
    @Optional()
    @Inject(TS_VALID_MONGO_CONNECTION_TOKENS)
    private readonly connectionTokens: (string | symbol)[],
  ) {
    this.shutdownConfig = resolveShutdownConfig();
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.connectionTokens) {
      return;
    }

    await executeShutdown({
      tokens: this.connectionTokens,
      moduleRef: this.moduleRef,
      shutdownConfig: this.shutdownConfig,
    });
  }

  // ... resto del código existente sin cambios
}
```

**Principios aplicados:**
- ✅ Early return
- ✅ Delegation (delega a executeShutdown)
- ✅ Composición sobre herencia
- ✅ Complejidad ciclomática: 1

**Tests:**
```typescript
// tests/integration/module-shutdown.spec.ts
describe('TsValidMongoModule.onModuleDestroy', () => {
  it('closes all connections successfully', async () => {
    // Setup module with mock connections
    // Call onModuleDestroy
    // Assert connections were closed
  });
});
```

---

## 📦 FASE 4: Documentation & Examples

### Objetivo
Actualizar ejemplos y documentación para guiar a usuarios.

---

### Commit 4.1
```
docs(examples): add enableShutdownHooks to basic example
```

**Archivos:**
- `examples/basic/src/main.ts`

**Cambios:**
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // SIGTERM handler for Kubernetes/Docker
  process.on('SIGTERM', async () => {
    await app.close();
  });

  app.enableCors();
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application running on: http://localhost:${port}`);
}
```

**Principios aplicados:**
- ✅ Declarativo (comentarios claros)
- ✅ Best practices

---

### Commit 4.2
```
docs(readme): add graceful shutdown section
```

**Archivos:**
- `README.md`

**Cambios:**
Agregar sección completa con ejemplos de configuración, Kubernetes, troubleshooting.

---

### Commit 4.3
```
docs(examples): add kubernetes deployment example
```

**Archivos:**
- `examples/k8s/deployment.yaml` (nuevo)

**Cambios:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nest-mongo-app
spec:
  template:
    spec:
      containers:
      - name: app
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
      terminationGracePeriodSeconds: 30
```

---

## 📦 FASE 5: Testing & Quality

### Objetivo
Asegurar coverage completo y calidad de código.

---

### Commit 5.1
```
test(shutdown): add integration tests for shutdown flow
```

**Archivos:**
- `tests/integration/shutdown-flow.spec.ts` (nuevo)

**Tests:**
- Shutdown con múltiples conexiones
- Shutdown con timeout
- Shutdown con fallos parciales

---

### Commit 5.2
```
test(shutdown): add stress tests for concurrent connections
```

**Archivos:**
- `tests/stress/shutdown-stress.spec.ts` (nuevo)

**Tests:**
- 50 conexiones simultáneas
- Memory leaks
- Performance benchmarks

---

### Commit 5.3
```
ci(tests): add shutdown tests to CI pipeline
```

**Archivos:**
- `.github/workflows/test.yml`

**Cambios:**
Agregar step específico para tests de shutdown.

---

## 📊 Resumen de Commits por Fase

```
FASE 1: Fundamentos (4 commits)
├── feat(types): add shutdown configuration types
├── feat(guards): add type guard for connection wrapper validation
├── feat(constants): add default shutdown configuration constants
└── test(helpers): add test helpers for shutdown scenarios

FASE 2: Core Logic (4 commits)
├── feat(shutdown): add timeout wrapper utility
├── feat(shutdown): add retry utility for connection close
├── feat(shutdown): add structured logger for shutdown events
└── feat(shutdown): add connection close orchestrator

FASE 3: Integration (3 commits)
├── refactor(module): extract shutdown configuration resolver
├── refactor(module): extract onModuleDestroy to dedicated service
└── refactor(module): integrate shutdown service into TsValidMongoModule

FASE 4: Documentation (3 commits)
├── docs(examples): add enableShutdownHooks to basic example
├── docs(readme): add graceful shutdown section
└── docs(examples): add kubernetes deployment example

FASE 5: Quality (3 commits)
├── test(shutdown): add integration tests for shutdown flow
├── test(shutdown): add stress tests for concurrent connections
└── ci(tests): add shutdown tests to CI pipeline

TOTAL: 17 commits atómicos
```

---

## 🎯 Métricas de Calidad por Commit

| Fase | Commits | Complejidad Ciclomática Promedio | Coverage Target |
|------|---------|----------------------------------|-----------------|
| 1    | 4       | 1-2                              | N/A (types)     |
| 2    | 4       | 2-3                              | >90%            |
| 3    | 3       | 1-3                              | >85%            |
| 4    | 3       | N/A                              | N/A (docs)      |
| 5    | 3       | N/A                              | >95% global     |

---

## ✅ Checklist de Implementación

### Antes de Cada Commit
- [ ] Código pasa linter (ESLint)
- [ ] Código pasa formatter (Prettier)
- [ ] Tests unitarios pasan
- [ ] Coverage no disminuye
- [ ] Build exitoso
- [ ] Commit message sigue Conventional Commits

### Después de Cada Fase
- [ ] Integration tests pasan
- [ ] Documentation actualizada
- [ ] CHANGELOG actualizado
- [ ] Code review completado

---

## 🚀 Orden de Ejecución Recomendado

1. **Semana 1:** Fase 1 + Fase 2 (8 commits)
2. **Semana 2:** Fase 3 + Fase 4 (6 commits)
3. **Semana 3:** Fase 5 + refinamiento (3 commits)

**Total: ~15 días de desarrollo**

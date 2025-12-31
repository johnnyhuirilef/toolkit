import type { MongoClient, Db } from 'mongodb';
import type TsValidMongoDb from 'ts-valid-mongodb';
import { vi } from 'vitest';

/**
 * Creates a mock MongoClient for testing
 */
export function createMockMongoClient(): MongoClient {
  const mockDatabase = {
    command: vi.fn().mockResolvedValue({ ok: 1 }),
    collection: vi.fn().mockReturnValue({
      createIndex: vi.fn().mockResolvedValue('index_name'),
    }),
    stats: vi.fn().mockResolvedValue({ collections: 1 }),
  } as unknown as Db;

  return {
    connect: vi.fn().mockResolvedValue(),
    close: vi.fn().mockResolvedValue(),
    db: vi.fn().mockReturnValue(mockDatabase),
  } as unknown as MongoClient;
}

/**
 * Creates a mock TsValidMongoDb instance
 */
export function createMockTsValidMongoDatabase(): TsValidMongoDb {
  const mockClient = createMockMongoClient();

  return {
    connect: vi.fn().mockResolvedValue(mockClient),
    disconnect: vi.fn().mockResolvedValue(),
    getDb: vi.fn().mockReturnValue(mockClient.db()),
    createModel: vi.fn().mockReturnValue({
      insert: vi.fn(),
      find: vi.fn(),
      findOneBy: vi.fn(),
      findById: vi.fn(),
      updateById: vi.fn(),
      updateOneBy: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteOneBy: vi.fn(),
      deleteById: vi.fn(),
      count: vi.fn(),
    }),
  } as unknown as TsValidMongoDb;
}

/**
 * Creates a mock Model with common CRUD operations
 */
export function createMockModel() {
  return {
    insert: vi.fn().mockResolvedValue({
      _id: 'mock-id',
      name: 'Test',
      email: 'test@example.com',
    }),
    find: vi.fn().mockResolvedValue([
      { _id: 'id1', name: 'User 1' },
      { _id: 'id2', name: 'User 2' },
    ]),
    findOneBy: vi.fn().mockResolvedValue({
      _id: 'mock-id',
      name: 'Test',
    }),
    findById: vi.fn().mockResolvedValue({
      _id: 'mock-id',
      name: 'Test',
    }),
    updateById: vi.fn().mockResolvedValue({
      _id: 'mock-id',
      name: 'Updated',
    }),
    updateOneBy: vi.fn().mockResolvedValue({
      _id: 'mock-id',
      name: 'Updated',
    }),
    updateMany: vi.fn().mockResolvedValue({
      matchedCount: 2,
      modifiedCount: 2,
    }),
    delete: vi.fn().mockResolvedValue(2),
    deleteOneBy: vi.fn().mockResolvedValue({
      _id: 'mock-id',
      name: 'Deleted',
    }),
    deleteById: vi.fn().mockResolvedValue({
      _id: 'mock-id',
      name: 'Deleted',
    }),
    count: vi.fn().mockResolvedValue(10),
  };
}

/**
 * Waits for all pending promises to resolve
 * Useful for testing async operations
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

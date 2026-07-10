import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createRepository, defineCollection } from '@wenu/mongo';
import type { DatabaseLike, Repository, Result } from '@wenu/mongo';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as z from 'zod';

import { startContainer, stopContainer, getUri, clientOptions } from './setup';
import { MongoModule } from '../../src/zod-mongo.module';
import { getConnectionToken } from '../../src/zod-mongo.tokens';

// Same generic domain example documented in the README's
// "Using this in a hexagonal / clean architecture setup" section.

type Product = { readonly id: string; readonly name: string; readonly price: number };
type ProductRepositoryError = { readonly kind: 'unknown'; readonly message: string };

type ProductRepository = {
  save(product: Product): Promise<Result<Product, ProductRepositoryError>>;
  findById(id: string): Promise<Result<Product | null, ProductRepositoryError>>;
};

const ProductCollection = defineCollection({
  name: 'products_hexagonal',
  schema: z.object({ _id: z.string(), name: z.string(), price: z.number().positive() }),
  idStrategy: 'string',
});

// Adapter — zero @nestjs/* imports anywhere in this class. Portable to any runtime
// that can hand it a DatabaseLike.
class ProductMongoRepository implements ProductRepository {
  private readonly repo: Repository<typeof ProductCollection.schema, 'string'>;

  constructor(database: DatabaseLike) {
    this.repo = createRepository(ProductCollection, database);
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
    const document_ = result.value;
    return {
      ok: true,
      value:
        document_ === null
          ? null
          : { id: document_._id, name: document_.name, price: document_.price },
    };
  }
}

const PRODUCT_REPOSITORY = 'PRODUCT_REPOSITORY';

// The only file that knows Nest exists — mirrors the README's ProductInfraModule.
@Module({
  providers: [
    {
      provide: PRODUCT_REPOSITORY,
      useFactory: (database: Db) => new ProductMongoRepository(database),
      inject: [getConnectionToken()],
    },
  ],
  exports: [PRODUCT_REPOSITORY],
})
class ProductInfraModule {}

const setup = async (): Promise<{ client: MongoClient; repo: ProductMongoRepository }> => {
  const client = new MongoClient(getUri(), clientOptions);
  await client.connect();
  const database: Db = client.db('test_hexagonal_adapter');
  const repo = new ProductMongoRepository(database);
  return { client, repo };
};

describe('hexagonal adapter pattern', () => {
  beforeAll(async () => {
    await startContainer();
  }, 90_000);

  afterAll(async () => {
    await stopContainer();
  });

  describe('adapter alone — zero Nest involved', () => {
    it('saves a product and finds it by id via a plain @wenu/mongo adapter', async () => {
      const { client, repo } = await setup();

      const saveResult = await repo.save({ id: 'sku-1', name: 'Widget', price: 9.99 });
      expect(saveResult.ok).toBe(true);

      const findResult = await repo.findById('sku-1');
      expect(findResult.ok).toBe(true);
      if (!findResult.ok) return;
      expect(findResult.value).toEqual({ id: 'sku-1', name: 'Widget', price: 9.99 });

      await client.close();
    }, 30_000);
  });

  describe('Nest wiring resolves the adapter for real', () => {
    it('resolves ProductMongoRepository through @InjectConnection / getConnectionToken()', async () => {
      const moduleReference = await Test.createTestingModule({
        imports: [
          MongoModule.forRoot({
            uri: getUri(),
            databaseName: 'test_hexagonal_wiring',
            clientOptions,
          }),
          ProductInfraModule,
        ],
      }).compile();

      const repository = moduleReference.get<ProductMongoRepository>(PRODUCT_REPOSITORY);
      expect(repository).toBeInstanceOf(ProductMongoRepository);

      const saveResult = await repository.save({ id: 'sku-2', name: 'Gadget', price: 19.99 });
      expect(saveResult.ok).toBe(true);

      const findResult = await repository.findById('sku-2');
      expect(findResult.ok).toBe(true);
      if (!findResult.ok) return;
      expect(findResult.value).toEqual({ id: 'sku-2', name: 'Gadget', price: 19.99 });

      await moduleReference.close();
    }, 30_000);
  });
});

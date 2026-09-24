import { Test } from '@nestjs/testing';
import { MongoClient } from 'mongodb';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createExistingOptionsAppModule } from './apps/existing-options.app-module';
import { createFactoryAppModule } from './apps/factory.app-module';
import { ItemService } from './apps/item.fixture';
import { createMongoClientAppModule } from './apps/mongo-client.app-module';
import {
  ItemServiceA,
  ItemServiceB,
  createMultiConnectionAppModule,
} from './apps/multi-connection.app-module';
import { createOptionsClassAppModule } from './apps/options-class.app-module';
import { createUriAppModule } from './apps/uri.app-module';
import { startContainer, stopContainer, getUri, clientOptions } from './setup';

describe('E2E: one application per configuration style', () => {
  beforeAll(async () => {
    await startContainer();
  }, 90_000);

  afterAll(async () => {
    await stopContainer();
  });

  it('uri app module: boots, inserts and reads back a document through the injected repository, then closes cleanly', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [createUriAppModule(getUri(), 'e2e_uri', clientOptions)],
    }).compile();

    const service = moduleReference.get(ItemService);
    const insertResult = await service.insert('uri-item');
    expect(insertResult.ok).toBe(true);
    if (!insertResult.ok) return;
    const findResult = await service.findById(insertResult.value._id);
    expect(findResult.ok).toBe(true);
    if (!findResult.ok) return;
    expect(findResult.value?.label).toBe('uri-item');

    await moduleReference.close();
  }, 30_000);

  it('mongoClient app module: boots and completes a repository round trip', async () => {
    const client = new MongoClient(getUri(), clientOptions);
    const moduleReference = await Test.createTestingModule({
      imports: [createMongoClientAppModule(client, 'e2e_mongo_client')],
    }).compile();

    const service = moduleReference.get(ItemService);
    const insertResult = await service.insert('mongo-client-item');
    expect(insertResult.ok).toBe(true);
    if (!insertResult.ok) return;
    const findResult = await service.findById(insertResult.value._id);
    expect(findResult.ok).toBe(true);
    if (!findResult.ok) return;
    expect(findResult.value?.label).toBe('mongo-client-item');

    await moduleReference.close();
  }, 30_000);

  it('factory app module: boots and completes a repository round trip', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [createFactoryAppModule(getUri(), 'e2e_factory', clientOptions)],
    }).compile();

    const service = moduleReference.get(ItemService);
    const insertResult = await service.insert('factory-item');
    expect(insertResult.ok).toBe(true);
    if (!insertResult.ok) return;
    const findResult = await service.findById(insertResult.value._id);
    expect(findResult.ok).toBe(true);
    if (!findResult.ok) return;
    expect(findResult.value?.label).toBe('factory-item');

    await moduleReference.close();
  }, 30_000);

  it('options-class (useClass) app module: boots and completes a repository round trip', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [createOptionsClassAppModule(getUri(), 'e2e_options_class', clientOptions)],
    }).compile();

    const service = moduleReference.get(ItemService);
    const insertResult = await service.insert('options-class-item');
    expect(insertResult.ok).toBe(true);
    if (!insertResult.ok) return;
    const findResult = await service.findById(insertResult.value._id);
    expect(findResult.ok).toBe(true);
    if (!findResult.ok) return;
    expect(findResult.value?.label).toBe('options-class-item');

    await moduleReference.close();
  }, 30_000);

  it('existing-options (useExisting) app module: boots and completes a repository round trip', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [createExistingOptionsAppModule(getUri(), 'e2e_existing_options', clientOptions)],
    }).compile();

    const service = moduleReference.get(ItemService);
    const insertResult = await service.insert('existing-options-item');
    expect(insertResult.ok).toBe(true);
    if (!insertResult.ok) return;
    const findResult = await service.findById(insertResult.value._id);
    expect(findResult.ok).toBe(true);
    if (!findResult.ok) return;
    expect(findResult.value?.label).toBe('existing-options-item');

    await moduleReference.close();
  }, 30_000);

  it('multi-connection app module: both connections complete independent repository round trips', async () => {
    const moduleReference = await Test.createTestingModule({
      imports: [
        createMultiConnectionAppModule(
          { uri: getUri(), databaseName: 'e2e_multi_a', clientOptions },
          { uri: getUri(), databaseName: 'e2e_multi_b', clientOptions },
        ),
      ],
    }).compile();

    const serviceA = moduleReference.get(ItemServiceA);
    const serviceB = moduleReference.get(ItemServiceB);

    const insertA = await serviceA.insert('multi-a-item');
    const insertB = await serviceB.insert('multi-b-item');
    expect(insertA.ok).toBe(true);
    expect(insertB.ok).toBe(true);
    if (!insertA.ok || !insertB.ok) return;

    const findA = await serviceA.findById(insertA.value._id);
    const findB = await serviceB.findById(insertB.value._id);
    expect(findA.ok).toBe(true);
    expect(findB.ok).toBe(true);
    if (!findA.ok || !findB.ok) return;
    expect(findA.value?.label).toBe('multi-a-item');
    expect(findB.value?.label).toBe('multi-b-item');

    await moduleReference.close();
  }, 30_000);
});

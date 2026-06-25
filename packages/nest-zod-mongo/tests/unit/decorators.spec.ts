import { Inject } from '@nestjs/common';
import { defineCollection } from '@wenu/mongo';
import { describe, it, expect } from 'vitest';
import * as z from 'zod';

import { InjectRepository, InjectConnection } from '../../src/zod-mongo.decorators';
import { DEFAULT_CONNECTION } from '../../src/zod-mongo.tokens';

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ name: z.string() }),
  id: 'objectid',
});

const OrderCollection = defineCollection({
  name: 'orders',
  schema: z.object({ total: z.number() }),
  id: 'objectid',
});

describe('InjectRepository', () => {
  it('returns Inject("usersRepository") for default connection with CollectionDef', () => {
    const decorator = InjectRepository(UserCollection);
    const expected = Inject('usersRepository');
    // Both are parameter decorators — compare the metadata they produce
    const targetA = {};
    const targetB = {};
    decorator(targetA, undefined, 0);
    expected(targetB, undefined, 0);
    expect(Reflect.getMetadata('self:paramtypes', targetA)).toEqual(
      Reflect.getMetadata('self:paramtypes', targetB),
    );
  });

  it('returns Inject("analytics_ordersRepository") for named connection with CollectionDef', () => {
    const decorator = InjectRepository(OrderCollection, 'analytics');
    const expected = Inject('analytics_ordersRepository');
    const targetA = {};
    const targetB = {};
    decorator(targetA, undefined, 0);
    expected(targetB, undefined, 0);
    expect(Reflect.getMetadata('self:paramtypes', targetA)).toEqual(
      Reflect.getMetadata('self:paramtypes', targetB),
    );
  });

  it('accepts a plain string name', () => {
    const decorator = InjectRepository('products');
    const expected = Inject('productsRepository');
    const targetA = {};
    const targetB = {};
    decorator(targetA, undefined, 0);
    expected(targetB, undefined, 0);
    expect(Reflect.getMetadata('self:paramtypes', targetA)).toEqual(
      Reflect.getMetadata('self:paramtypes', targetB),
    );
  });
});

describe('InjectConnection', () => {
  it('returns Inject(DEFAULT_CONNECTION) when no connectionName', () => {
    const decorator = InjectConnection();
    const expected = Inject(DEFAULT_CONNECTION);
    const targetA = {};
    const targetB = {};
    decorator(targetA, undefined, 0);
    expected(targetB, undefined, 0);
    expect(Reflect.getMetadata('self:paramtypes', targetA)).toEqual(
      Reflect.getMetadata('self:paramtypes', targetB),
    );
  });

  it('returns Inject("primary") for named connection', () => {
    const decorator = InjectConnection('primary');
    const expected = Inject('primary');
    const targetA = {};
    const targetB = {};
    decorator(targetA, undefined, 0);
    expected(targetB, undefined, 0);
    expect(Reflect.getMetadata('self:paramtypes', targetA)).toEqual(
      Reflect.getMetadata('self:paramtypes', targetB),
    );
  });
});

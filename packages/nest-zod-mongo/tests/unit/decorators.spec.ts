import { Inject } from '@nestjs/common';
import type { InjectionToken } from '@nestjs/common';
import { defineCollection } from '@wenu/mongo';
import { describe, it, expect } from 'vitest';
import * as z from 'zod';

import {
  InjectRepository,
  InjectConnection,
  InjectClientWrapper,
} from '../../src/zod-mongo.decorators';
import { DEFAULT_CONNECTION, getClientWrapperToken } from '../../src/zod-mongo.tokens';

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

// Parameter decorators can't be compared by reference — @Inject(token) builds a
// closure each call. Comparing the Reflect metadata they attach to a target is
// the only way to assert two decorators are behaviorally identical.
const expectSameInjectMetadata = (decorator: ParameterDecorator, expectedToken: InjectionToken) => {
  const expected = Inject(expectedToken);
  const targetA = {};
  const targetB = {};
  decorator(targetA, undefined, 0);
  expected(targetB, undefined, 0);
  expect(Reflect.getMetadata('self:paramtypes', targetA)).toEqual(
    Reflect.getMetadata('self:paramtypes', targetB),
  );
};

describe('InjectRepository', () => {
  it('returns Inject("usersRepository") for default connection with CollectionDef', () => {
    expectSameInjectMetadata(InjectRepository(UserCollection), 'usersRepository');
  });

  it('returns Inject("analytics_ordersRepository") for named connection with CollectionDef', () => {
    expectSameInjectMetadata(
      InjectRepository(OrderCollection, 'analytics'),
      'analytics_ordersRepository',
    );
  });

  it('accepts a plain string name', () => {
    expectSameInjectMetadata(InjectRepository('products'), 'productsRepository');
  });
});

describe('InjectConnection', () => {
  it('returns Inject(DEFAULT_CONNECTION) when no connectionName', () => {
    expectSameInjectMetadata(InjectConnection(), DEFAULT_CONNECTION);
  });

  it('returns Inject("primary") for named connection', () => {
    expectSameInjectMetadata(InjectConnection('primary'), 'primary');
  });
});

describe('InjectClientWrapper', () => {
  it('returns Inject(getClientWrapperToken()) for default connection', () => {
    expectSameInjectMetadata(InjectClientWrapper(), getClientWrapperToken(undefined));
  });

  it('returns Inject(getClientWrapperToken("reporting")) for named connection', () => {
    expectSameInjectMetadata(InjectClientWrapper('reporting'), getClientWrapperToken('reporting'));
  });
});

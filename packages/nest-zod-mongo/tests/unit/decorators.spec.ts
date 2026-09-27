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
import {
  getConnectionToken,
  getClientWrapperToken,
  getRepositoryToken,
} from '../../src/zod-mongo.tokens';

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ name: z.string() }),
  idStrategy: 'objectid',
});

const OrderCollection = defineCollection({
  name: 'orders',
  schema: z.object({ total: z.number() }),
  idStrategy: 'objectid',
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
  it('returns Inject(getRepositoryToken(...)) for default connection with CollectionDef', () => {
    expectSameInjectMetadata(InjectRepository(UserCollection), getRepositoryToken('users'));
  });

  it('returns Inject(getRepositoryToken(..., "analytics")) for named connection with CollectionDef', () => {
    expectSameInjectMetadata(
      InjectRepository(OrderCollection, 'analytics'),
      getRepositoryToken('orders', 'analytics'),
    );
  });

  it('accepts a plain string name', () => {
    expectSameInjectMetadata(InjectRepository('products'), getRepositoryToken('products'));
  });
});

describe('InjectConnection', () => {
  it('returns Inject(getConnectionToken()) when no connectionName', () => {
    expectSameInjectMetadata(InjectConnection(), getConnectionToken());
  });

  it('returns Inject(getConnectionToken("primary")) for named connection', () => {
    expectSameInjectMetadata(InjectConnection('primary'), getConnectionToken('primary'));
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

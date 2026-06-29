import { HealthIndicatorService } from '@nestjs/terminus';
import type { Db } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import { MongoHealthIndicator } from '../../src/health/mongo-health.indicator.js';

const setup = () => {
  const indicator = new MongoHealthIndicator(new HealthIndicatorService());
  return { indicator };
};

const mockDb = (result: 'resolve' | 'reject'): Pick<Db, 'command'> => ({
  command: vi.fn(
    result === 'resolve'
      ? () => Promise.resolve({ ok: 1 })
      : () => Promise.reject(new Error('connection refused')),
  ),
});

describe('MongoHealthIndicator', () => {
  it('returns { status: "up" } when ping succeeds', async () => {
    const { indicator } = setup();

    const result = await indicator.isHealthy('mongodb', mockDb('resolve'));

    expect(result).toEqual({ mongodb: { status: 'up' } });
  });

  it('returns { status: "down", error } when ping fails', async () => {
    const { indicator } = setup();

    const result = await indicator.isHealthy('mongodb', mockDb('reject'));

    expect(result).toEqual({
      mongodb: { status: 'down', error: 'Error: connection refused' },
    });
  });

  it('uses the key argument as the result property name', async () => {
    const { indicator } = setup();

    const result = await indicator.isHealthy('primary-db', mockDb('resolve'));

    expect(result).toEqual({ 'primary-db': { status: 'up' } });
  });
});

import { Logger } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { Db } from 'mongodb';
import { MongoNetworkError } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import { MongoHealthIndicator } from '../../src/health/mongo-health.indicator.js';

const setup = () => {
  const indicator = new MongoHealthIndicator(new HealthIndicatorService());
  return { indicator };
};

const mockDb = (result: 'resolve' | 'reject', error?: Error): Pick<Db, 'command'> => ({
  command: vi.fn(
    result === 'resolve'
      ? () => Promise.resolve({ ok: 1 })
      : () => Promise.reject(error ?? new Error('connection refused')),
  ),
});

describe('MongoHealthIndicator', () => {
  it('returns { status: "up" } when ping succeeds', async () => {
    const { indicator } = setup();

    const result = await indicator.isHealthy('mongodb', mockDb('resolve'));

    expect(result).toEqual({ mongodb: { status: 'up' } });
  });

  it('returns a sanitized { status: "down", kind, message } when ping fails', async () => {
    const { indicator } = setup();

    const result = await indicator.isHealthy('mongodb', mockDb('reject'));

    expect(result).toEqual({
      mongodb: { status: 'down', kind: 'unknown', message: 'Database health check failed' },
    });
  });

  it('maps a connection-class failure to kind: connection without leaking driver detail', async () => {
    const { indicator } = setup();
    const hostname = 'internal-mongo-shard-07.private.example.com';
    const networkError = new MongoNetworkError(`connect ECONNREFUSED ${hostname}:27017`);

    const result = await indicator.isHealthy('mongodb', mockDb('reject', networkError));

    expect(result).toEqual({
      mongodb: { status: 'down', kind: 'connection', message: 'Database health check failed' },
    });
    const payload = JSON.stringify(result);
    expect(payload).not.toContain(hostname);
    expect(payload).not.toContain(networkError.message);
  });

  it('logs the full original error via NestJS Logger', async () => {
    const { indicator } = setup();
    const errorSpy = vi.spyOn(Logger, 'error').mockImplementation(() => undefined);
    const originalError = new Error('connection refused: 10.0.0.5:27017');

    await indicator.isHealthy('mongodb', mockDb('reject', originalError));

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('connection refused: 10.0.0.5:27017'),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it('uses the key argument as the result property name', async () => {
    const { indicator } = setup();

    const result = await indicator.isHealthy('primary-db', mockDb('resolve'));

    expect(result).toEqual({ 'primary-db': { status: 'up' } });
  });
});

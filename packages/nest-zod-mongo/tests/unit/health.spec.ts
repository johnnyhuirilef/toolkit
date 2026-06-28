import { HealthIndicatorService } from '@nestjs/terminus';
import type { Db } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import { MongoHealthIndicator } from '../../src/health/mongo-health.indicator.js';

const setup = () => {
  const healthIndicatorService = new HealthIndicatorService();
  const indicator = new MongoHealthIndicator(healthIndicatorService);
  return { indicator };
};

describe('MongoHealthIndicator', () => {
  it('returns healthy status when ping succeeds', async () => {
    const { indicator } = setup();
    const database = { command: vi.fn().mockResolvedValue({ ok: 1 }) } as unknown as Db;

    const result = await indicator.isHealthy('mongodb', database);

    expect(result).toEqual({ mongodb: { status: 'up' } });
  });

  it('returns unhealthy status when ping fails', async () => {
    const { indicator } = setup();
    const database = {
      command: vi.fn().mockRejectedValue(new Error('connection refused')),
    } as unknown as Db;

    const result = await indicator.isHealthy('mongodb', database);

    expect(result['mongodb']?.status).toBe('down');
  });
});

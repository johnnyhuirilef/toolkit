import { Injectable } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { Db } from 'mongodb';

@Injectable()
export class MongoHealthIndicator {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  async isHealthy(key: string, database: Db): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await database.command({ ping: 1 });
      return indicator.up();
    } catch (error) {
      return indicator.down({ error: String(error) });
    }
  }
}

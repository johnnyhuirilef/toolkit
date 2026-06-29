import { Injectable } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { Db } from 'mongodb';
import { tryit } from 'radashi';

@Injectable()
export class MongoHealthIndicator {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  async isHealthy(key: string, database: Pick<Db, 'command'>): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const [error] = await tryit(() => database.command({ ping: 1 }))();
    return error === undefined ? indicator.up() : indicator.down({ error: String(error) });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import type { HealthIndicatorResult } from '@nestjs/terminus';
import { HealthIndicatorService } from '@nestjs/terminus';
import { toDbError } from '@wenu/mongo';
import type { Db } from 'mongodb';
import { tryit } from 'radashi';

const HEALTH_CHECK_FAILED_MESSAGE = 'Database health check failed';

@Injectable()
export class MongoHealthIndicator {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  async isHealthy(key: string, database: Pick<Db, 'command'>): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const [error] = await tryit(() => database.command({ ping: 1 }))();
    if (error === undefined) return indicator.up();
    const databaseError = toDbError(error);
    Logger.error(`MongoDB health check failed: ${databaseError.message}`, 'MongoHealthIndicator');
    return indicator.down({ kind: databaseError.kind, message: HEALTH_CHECK_FAILED_MESSAGE });
  }
}

import { Module } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';

import { MongoHealthIndicator } from './mongo-health.indicator.js';

@Module({
  providers: [HealthIndicatorService, MongoHealthIndicator],
  exports: [MongoHealthIndicator],
})
export class MongoHealthModule {}

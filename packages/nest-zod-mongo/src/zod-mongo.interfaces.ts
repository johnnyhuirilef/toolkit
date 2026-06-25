import type { ModuleMetadata, InjectionToken } from '@nestjs/common';
import type { Result } from '@wenu/mongo';
import type { MongoClient, MongoClientOptions } from 'mongodb';

type MongoOptionsBase = {
  readonly connectionName?: string | symbol;
  readonly databaseName: string;
  readonly syncIndexes?: boolean;
  readonly shutdownTimeoutMs?: number;
  readonly shutdownRetryAttempts?: number;
  readonly forceShutdown?: boolean;
};

type MongoOptionsWithUri = MongoOptionsBase & {
  readonly uri: string;
  readonly clientOptions?: MongoClientOptions;
  readonly mongoClient?: never;
};

type MongoOptionsWithClient = MongoOptionsBase & {
  readonly mongoClient: MongoClient;
  readonly uri?: never;
  readonly clientOptions?: never;
};

export type MongoOptions = MongoOptionsWithUri | MongoOptionsWithClient;

export type MongoAsyncOptions = Pick<ModuleMetadata, 'imports'> & {
  readonly connectionName?: string | symbol;
  readonly useFactory: (...arguments_: readonly unknown[]) => Promise<MongoOptions> | MongoOptions;
  readonly inject?: readonly InjectionToken[];
};

export type MongoClientWrapper = {
  readonly client: MongoClient;
  readonly close: (force?: boolean) => Promise<Result<null>>;
};

import type { ModuleMetadata, InjectionToken } from '@nestjs/common';
import type { Result } from '@wenu/mongo';
import type { MongoClient, MongoClientOptions } from 'mongodb';

type ZodMongoOptionsBase = {
  readonly connectionName?: string | symbol;
  readonly databaseName: string;
  readonly syncIndexes?: boolean;
  readonly shutdownTimeoutMs?: number;
  readonly shutdownRetryAttempts?: number;
  readonly forceShutdown?: boolean;
};

type ZodMongoOptionsWithUri = ZodMongoOptionsBase & {
  readonly uri: string;
  readonly clientOptions?: MongoClientOptions;
  readonly mongoClient?: never;
};

type ZodMongoOptionsWithClient = ZodMongoOptionsBase & {
  readonly mongoClient: MongoClient;
  readonly uri?: never;
  readonly clientOptions?: never;
};

export type ZodMongoOptions = ZodMongoOptionsWithUri | ZodMongoOptionsWithClient;

export type ZodMongoAsyncOptions = Pick<ModuleMetadata, 'imports'> & {
  readonly connectionName?: string | symbol;
  readonly useFactory: (
    ...arguments_: readonly unknown[]
  ) => Promise<ZodMongoOptions> | ZodMongoOptions;
  readonly inject?: readonly InjectionToken[];
};

export type MongoClientWrapper = {
  readonly client: MongoClient;
  readonly close: (force?: boolean) => Promise<Result<null>>;
};

import type { ModuleMetadata, InjectionToken } from '@nestjs/common';
import type { Result } from '@wenu/mongo';
import type { Db, MongoClient, MongoClientOptions } from 'mongodb';

type MongoOptionsBase = {
  readonly connectionName?: string;
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
  readonly connectionName?: string;
  readonly useFactory: (...arguments_: readonly unknown[]) => Promise<MongoOptions> | MongoOptions;
  readonly inject?: readonly InjectionToken[];
};

export type MongoClientWrapper = {
  readonly client: MongoClient;
  readonly close: (force?: boolean) => Promise<Result<null>>;
};

// Internal — one established connection's identity and handles, injected as a single record
// so a core module needs exactly one constructor parameter (never exported from index.ts).
export type MongoConnection = {
  readonly connectionName: string;
  readonly options: MongoOptions;
  readonly db: Db;
  readonly wrapper: MongoClientWrapper;
};

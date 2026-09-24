import type { FactoryProvider, ModuleMetadata, Type } from '@nestjs/common';
import type { Result } from '@wenu/mongo';
import type { Db, MongoClient, MongoClientOptions } from 'mongodb';

type MongoConnectionOptionsBase = {
  readonly databaseName: string;
  readonly syncIndexes?: boolean;
  // Omitted or `true` closes the underlying client on shutdown; `false` leaves a caller-owned
  // client usable after `app.close()`.
  readonly autoCloseConnection?: boolean;
  readonly shutdownTimeoutMs?: number;
  readonly shutdownRetryAttempts?: number;
  readonly forceShutdown?: boolean;
};

export type MongoConnectionOptionsWithUri = MongoConnectionOptionsBase & {
  readonly uri: string;
  readonly clientOptions?: MongoClientOptions;
  readonly mongoClient?: never;
};

type MongoConnectionOptionsWithClient = MongoConnectionOptionsBase & {
  readonly mongoClient: MongoClient;
  readonly uri?: never;
  readonly clientOptions?: never;
};

// Returned by a `useFactory`/`MongoOptionsFactory.createMongoOptions` resolution — never carries a
// connection name. The registration's own `connectionName` (see `MongoOptions` below) is always
// the sole source of truth for which connection is being configured.
export type MongoConnectionOptions =
  | MongoConnectionOptionsWithUri
  | MongoConnectionOptionsWithClient;

// Static `forRoot` registration options — the only shape allowed to carry `connectionName`.
export type MongoOptions = MongoConnectionOptions & { readonly connectionName?: string };

export type MongoOptionsFactory = {
  createMongoOptions(
    connectionName: string,
  ): MongoConnectionOptions | Promise<MongoConnectionOptions>;
};

type MongoAsyncOptionsBase = Pick<ModuleMetadata, 'imports'> & { readonly connectionName?: string };

// Nest's own `FactoryProvider['useFactory']` type lets a typed factory such as
// `(config: ConfigService) => ...` be assigned without a cast; a hand-written `unknown[]` signature
// rejects it. The `?: never` fields make the compiler accept exactly one mechanism.
export type MongoAsyncOptions = MongoAsyncOptionsBase &
  (
    | {
        readonly useFactory: FactoryProvider<MongoConnectionOptions>['useFactory'];
        readonly inject?: FactoryProvider['inject'];
        readonly useClass?: never;
        readonly useExisting?: never;
      }
    | {
        readonly useClass: Type<MongoOptionsFactory>;
        readonly useFactory?: never;
        readonly inject?: never;
        readonly useExisting?: never;
      }
    | {
        readonly useExisting: Type<MongoOptionsFactory>;
        readonly useFactory?: never;
        readonly inject?: never;
        readonly useClass?: never;
      }
  );

export type MongoClientWrapper = {
  readonly client: MongoClient;
  readonly close: (force?: boolean) => Promise<Result<null>>;
};

// Internal — one established connection's identity and handles, injected as a single record
// so a core module needs exactly one constructor parameter (never exported from index.ts).
// `options` never carries `connectionName` — the registration's own name (below) is authoritative.
export type MongoConnection = {
  readonly connectionName: string;
  readonly options: MongoConnectionOptions;
  readonly db: Db;
  readonly wrapper: MongoClientWrapper;
};

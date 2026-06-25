import { MongoDBContainer } from '@testcontainers/mongodb';
import type { StartedMongoDBContainer } from '@testcontainers/mongodb';
import type { MongoClientOptions } from 'mongodb';

let container: StartedMongoDBContainer | undefined;

export const startContainer = async (): Promise<StartedMongoDBContainer> => {
  container = await new MongoDBContainer('mongo:7').start();
  return container;
};

export const stopContainer = async (): Promise<void> => {
  await container?.stop();
  container = undefined;
};

export const getUri = (): string => {
  if (container === undefined) throw new Error('Container not started');
  return container.getConnectionString();
};

// ponytail: directConnection bypasses replica-set discovery so the driver connects
// to the mapped port instead of the container's internal hostname (unreachable from host)
export const clientOptions: MongoClientOptions = { directConnection: true };

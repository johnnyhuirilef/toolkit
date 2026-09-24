import { isEmpty } from 'radashi';

import { MongoConfigurationError } from './zod-mongo.errors';

export const ensureConnectionName = (connectionName: string): string => {
  if (isEmpty(connectionName))
    throw new MongoConfigurationError('Connection name must be a non-empty string.');
  if (connectionName.includes('/'))
    throw new MongoConfigurationError(
      `Connection name "${connectionName}" must not contain "/". Use a name without "/".`,
    );
  return connectionName;
};

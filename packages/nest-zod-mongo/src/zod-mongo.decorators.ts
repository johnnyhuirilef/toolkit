import { Inject } from '@nestjs/common';
import type { CollectionDef, ZodCompat, IdStrategy } from '@wenu/mongo';
import { isString } from 'radashi';

import { getRepositoryToken, getConnectionToken, getClientWrapperToken } from './zod-mongo.tokens';

export const InjectRepository = (
  collection: string | CollectionDef<ZodCompat, IdStrategy>,
  connectionName?: string | symbol,
): ParameterDecorator =>
  Inject(getRepositoryToken(isString(collection) ? collection : collection.name, connectionName));

export const InjectConnection = (connectionName?: string | symbol): ParameterDecorator =>
  Inject(getConnectionToken(connectionName));

export const InjectClientWrapper = (connectionName?: string | symbol): ParameterDecorator =>
  Inject(getClientWrapperToken(connectionName));

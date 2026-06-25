import { defineCollection } from '@ioni/zod-mongo';
import type { FactoryProvider } from '@nestjs/common';
import { describe, it, expect } from 'vitest';
import * as z from 'zod';

import { ZodMongoConfigurationError } from '../../src/zod-mongo.errors';
import { createRepositoryProviders, establishConnection } from '../../src/zod-mongo.providers';
import { getRepositoryToken } from '../../src/zod-mongo.tokens';

const UserCollection = defineCollection({
  name: 'users',
  schema: z.object({ name: z.string() }),
  id: 'objectid',
});

describe('ensureValidOptions (via establishConnection)', () => {
  it('throws ZodMongoConfigurationError when neither uri nor mongoClient provided', async () => {
    await expect(
      // @ts-expect-error — intentionally invalid options
      establishConnection({ databaseName: 'test' }),
    ).rejects.toBeInstanceOf(ZodMongoConfigurationError);
  });
});

describe('createRepositoryProviders', () => {
  it('returns one provider per collection', () => {
    const providers = createRepositoryProviders([UserCollection]);
    expect(providers).toHaveLength(1);
  });

  it('assigns the correct provide token', () => {
    const providers = createRepositoryProviders([UserCollection]) as FactoryProvider[];
    expect(providers[0]?.provide).toBe(getRepositoryToken('users'));
  });

  it('assigns correct token for named connection', () => {
    const providers = createRepositoryProviders([UserCollection], 'analytics') as FactoryProvider[];
    expect(providers[0]?.provide).toBe(getRepositoryToken('users', 'analytics'));
  });
});

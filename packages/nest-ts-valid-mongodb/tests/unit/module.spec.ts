import { Test } from '@nestjs/testing'; // eslint-disable-line n/no-extraneous-import
import { vi, describe, it, expect } from 'vitest'; // eslint-disable-line n/no-extraneous-import

import { TsValidMongoModule } from '../../src/lib/core/module';
import { TsValidMongoConfigurationError } from '../../src/lib/errors';
import type { TsValidMongoConnectionOptions } from '../../src/lib/interfaces';

describe('TsValidMongoModule', () => {
  describe('Configuration Validation', () => {
    it('should throw ConfigurationError if neither uri nor client provided', async () => {
      // Suppress logs
      vi.spyOn(console, 'error').mockImplementation(vi.fn());

      const invalidOptions = {
        databaseName: 'test_db',
      } as unknown as TsValidMongoConnectionOptions;

      const modulePromise = Test.createTestingModule({
        imports: [TsValidMongoModule.forRoot(invalidOptions)],
      }).compile();

      await expect(modulePromise).rejects.toThrow(TsValidMongoConfigurationError);
    });
  });

  // TODO: Fix mocking of external 'ts-valid-mongodb' library to test successful connection
  describe.skip('Connection Logic', () => {
    it('should provide the connection wrapper with default name', async () => {
      // Skipped
    });
  });
});

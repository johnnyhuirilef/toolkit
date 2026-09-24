import { describe, it, expect } from 'vitest';

import * as packageExports from '../../src/index';

describe('package export surface', () => {
  it('does not include DEFAULT_CONNECTION', () => {
    expect(Object.keys(packageExports)).not.toContain('DEFAULT_CONNECTION');
  });

  it('exports DEFAULT_CONNECTION_NAME', () => {
    expect(packageExports.DEFAULT_CONNECTION_NAME).toBe('default');
  });
});

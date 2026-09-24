import { describe, it, expect } from 'vitest';

import * as packageExports from '../../src/index';

const setup = () => ({ packageExports });

describe('package export surface', () => {
  it('does not include DEFAULT_CONNECTION', () => {
    const { packageExports: sut } = setup();

    expect(Object.keys(sut)).not.toContain('DEFAULT_CONNECTION');
  });

  it('exports DEFAULT_CONNECTION_NAME', () => {
    const { packageExports: sut } = setup();

    expect(sut.DEFAULT_CONNECTION_NAME).toBe('default');
  });
});

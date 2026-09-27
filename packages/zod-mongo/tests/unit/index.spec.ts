import { tryit } from 'radashi';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import { ConfigurationError, defineCollection } from '../../src/index.js';

// Reflect.apply performs an untyped call, as a plain JavaScript caller would: an empty name cannot
// be passed through the typed signature without a cast.
const defineAsUntypedCaller = (options: object): unknown =>
  Reflect.apply(defineCollection, undefined, [options]);

const setup = () => ({
  defineWithEmptyName: tryit(() =>
    defineAsUntypedCaller({ name: '', schema: z.object({}), idStrategy: 'uuid' }),
  ),
});

describe('package entry point', () => {
  it('exports ConfigurationError so callers can identify setup errors with instanceof', () => {
    const { defineWithEmptyName } = setup();

    const [error] = defineWithEmptyName();

    expect(error).toBeInstanceOf(ConfigurationError);
  });
});

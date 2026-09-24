import { readFileSync } from 'node:fs';

import { describe, it, expect } from 'vitest';
import * as z from 'zod';

const PackageManifest = z.object({
  peerDependencies: z.object({ mongodb: z.string() }),
});

const setup = () => {
  const raw: unknown = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  return { manifest: PackageManifest.parse(raw) };
};

describe('package.json', () => {
  // Shared clients rely on MongoClient.close() being idempotent, verified on the 6.x driver.
  it('requires mongodb >=6.0.0 as a peer dependency', () => {
    const { manifest } = setup();

    expect(manifest.peerDependencies.mongodb).toBe('>=6.0.0');
  });
});

#!/usr/bin/env node
// Verifies every workspace package's published peerDependencies range on a
// sibling workspace package is satisfied by that sibling's current version.
// Prevents the class of bug where package A ships peerDependencies["@wenu/mongo"]
// pinned to a stale range after B bumps its version (see nest-mongo ^0.3.0 bug).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const packagesDir = join(import.meta.dirname, '..', 'packages');

// Minimal semver comparator: handles the "^x.y.z", ">=x.y.z", and "a || b"
// shapes actually used in this workspace's peerDependencies. Not a general
// semver-range parser — intentionally, to avoid a new dependency.
const parse = (version) => version.replace(/^[\^~>=<]+/, '').split('.').map(Number);

const compare = ([aMajor, aMinor, aPatch], [bMajor, bMinor, bPatch]) =>
  aMajor - bMajor || aMinor - bMinor || aPatch - bPatch;

const satisfiesSimpleRange = (version, range) => {
  const v = parse(version);
  if (range.startsWith('^')) {
    const r = parse(range);
    // Caret ranges are major-locked, except 0.x where minor is the locked
    // digit (and 0.0.x where patch is locked) per semver's "next non-zero" rule.
    const lockedIndex = r[0] !== 0 ? 0 : r[1] !== 0 ? 1 : 2;
    const sameLockedDigit = v.slice(0, lockedIndex + 1).every((n, i) => n === r[i]);
    return sameLockedDigit && compare(v, r) >= 0;
  }
  if (range.startsWith('>=')) {
    return compare(v, parse(range)) >= 0;
  }
  if (/^\d+\.\d+\.\d+$/.test(range)) {
    return version === range;
  }
  // Fail loudly on syntax this minimal parser doesn't understand ("~", "<",
  // "1.x", pre-release tags) — a false "violation" message would lie about
  // the cause and a silent pass would defeat the check entirely.
  throw new Error(
    `Unsupported peer range syntax "${range}" — extend satisfiesSimpleRange in ${import.meta.url}`,
  );
};

const satisfiesRange = (version, range) =>
  range.split('||').some((part) => satisfiesSimpleRange(version, part.trim()));

const readPackageJson = (dir) =>
  JSON.parse(readFileSync(join(packagesDir, dir, 'package.json'), 'utf8'));

const packages = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({ dir: entry.name, json: readPackageJson(entry.name) }));

const byName = new Map(packages.map((pkg) => [pkg.json.name, pkg]));

let failures = 0;

for (const pkg of packages) {
  const peerDeps = pkg.json.peerDependencies ?? {};
  for (const [peerName, peerRange] of Object.entries(peerDeps)) {
    const dependency = byName.get(peerName);
    if (!dependency) continue; // peer isn't a workspace package (e.g. mongodb, zod)

    const declaredRange = { ...pkg.json.dependencies, ...pkg.json.devDependencies }[peerName];
    if (declaredRange !== 'workspace:*') continue;

    const currentVersion = dependency.json.version;
    if (!satisfiesRange(currentVersion, peerRange)) {
      console.error(
        `FAIL: ${pkg.json.name} declares peerDependencies["${peerName}"] = "${peerRange}", ` +
          `but ${peerName}'s current version is ${currentVersion}, which is outside that range.`,
      );
      failures++;
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} peer-range violation(s) found.`);
  process.exit(1);
}

console.log('All workspace peer-dependency ranges are satisfied.');

// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  _comment: "Mutation testing for nest-ts-valid-mongodb",
  packageManager: "pnpm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  testRunnerNodeArgs: ["--experimental-vm-modules"],
  plugins: ["@stryker-mutator/vitest-runner"],
  coverageAnalysis: "perTest",
  ignoreStatic: true,
  // Paths are relative to the process working directory (root), so we need specific paths
  mutate: [
    "packages/nest-ts-valid-mongodb/src/**/*.ts",
    "!packages/nest-ts-valid-mongodb/src/**/*.spec.ts",
    "!packages/nest-ts-valid-mongodb/src/**/index.ts",
    "!packages/nest-ts-valid-mongodb/src/main.ts",
    "!packages/nest-ts-valid-mongodb/src/**/*.module.ts"
  ],
  vitest: {
    // We explicitly point to the package's vitest config to avoid workspace conflicts
    configFile: "packages/nest-ts-valid-mongodb/vitest.config.mts",
    dir: "packages/nest-ts-valid-mongodb"
  }
};
export default config;

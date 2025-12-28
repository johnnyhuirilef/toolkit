// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  _comment: "Run mutation testing on the specific package",
  packageManager: "pnpm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  testRunnerNodeArgs: ["--experimental-vm-modules"],
  coverageAnalysis: "perTest",
  ignoreStatic: true,
  mutate: [
    "packages/*/src/**/*.ts",
    "!packages/*/src/**/*.spec.ts",
    "!packages/*/src/**/index.ts"
  ]
};
export default config;

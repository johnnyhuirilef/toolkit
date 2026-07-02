// ponytail: mongodb v5's findOneAnd* methods resolve a ModifyResult wrapper ({ value: doc })
// by default (includeResultMetadata defaults to true); v6/v7 resolve the doc directly.
// MONGO_MAJOR can't be mocked (ESM, module-load-time require), so mocks must mirror whatever
// the real installed driver returns — same detection the production shim uses.
// eslint-disable-next-line @typescript-eslint/no-require-imports, unicorn/prefer-module
const driverVersion = (require('mongodb/package.json') as { version: string }).version;
const MONGO_MAJOR = Number(/^(\d+)/.exec(driverVersion)?.[1]);

export const findAndModifyResult = <Doc>(document_: Doc | null) =>
  MONGO_MAJOR <= 5 ? { value: document_ } : document_;

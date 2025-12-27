# Changelog

## [0.2.0](https://github.com/johnnyhuirilef/toolkit/compare/nest-ts-valid-mongodb-v0.1.5...nest-ts-valid-mongodb-v0.2.0) (2025-12-27)


### Features

* **constants:** add default shutdown configuration constants ([f50d0ff](https://github.com/johnnyhuirilef/toolkit/commit/f50d0ff304b94471cea143046e54fa08e395ff59))
* **guards:** add type guard for connection wrapper validation ([6bd88cc](https://github.com/johnnyhuirilef/toolkit/commit/6bd88ccea58a3ac03d0227ca84cfd3f5b8ef7645))
* **shutdown:** add connection close orchestrator ([1c6a93d](https://github.com/johnnyhuirilef/toolkit/commit/1c6a93d3ed45452474cc27a0cf94d602fdfd3db2))
* **shutdown:** add retry utility for connection close ([f7893e4](https://github.com/johnnyhuirilef/toolkit/commit/f7893e46a70242a244d5ae13f328646d96230f48))
* **shutdown:** add structured logger for shutdown events ([7c87b1c](https://github.com/johnnyhuirilef/toolkit/commit/7c87b1c973283e4989bae6b625709ec4c7da5a03))
* **shutdown:** add timeout wrapper utility ([4d8f524](https://github.com/johnnyhuirilef/toolkit/commit/4d8f5242c5739ec09317ed0562a4a92d6081bf69))
* **types:** add shutdown configuration types ([ad8bdb9](https://github.com/johnnyhuirilef/toolkit/commit/ad8bdb97bf37a2789b3a538dd6b31cc80602b10a))


### Bug Fixes

* **module:** inject user options for shutdown configuration ([40ee54f](https://github.com/johnnyhuirilef/toolkit/commit/40ee54fcfee52b0d5fd8ae54b49d4706458c1003))
* **module:** pass forceClose parameter to native client close ([7573a13](https://github.com/johnnyhuirilef/toolkit/commit/7573a139b361f2cbcb02d7022ecf514322422db6))


### Documentation

* **examples:** add enableShutdownHooks to basic example ([6103d58](https://github.com/johnnyhuirilef/toolkit/commit/6103d580cc7151d0cf2301e3bf2ea3012d2f48d9))
* **readme:** add configuration notes and logging recommendations ([00e33c3](https://github.com/johnnyhuirilef/toolkit/commit/00e33c32420f3633918ab2425244a00bc5e7a782))
* **readme:** add graceful shutdown section with configuration and examples ([0db72e5](https://github.com/johnnyhuirilef/toolkit/commit/0db72e57f4d422b833b15b6784366cbecef1a109))
* **readme:** improve graceful shutdown documentation and clarify forceShutdown behavior ([e23e17c](https://github.com/johnnyhuirilef/toolkit/commit/e23e17c50c62ca74e17cee193b8b826f0bf05426))


### Code Refactoring

* **guards:** move guards to shutdown utils ([ed1858d](https://github.com/johnnyhuirilef/toolkit/commit/ed1858d6ef906cfbd48e5d4d0f306106f2556b72))
* **module:** change lifecycle hook to OnApplicationShutdown ([1e7022d](https://github.com/johnnyhuirilef/toolkit/commit/1e7022dab72415d944d2a01b8d1966ec1dbabe43))
* **module:** extract onModuleDestroy to dedicated service ([6be1497](https://github.com/johnnyhuirilef/toolkit/commit/6be1497fb1ba215900f6433042d9d79664011e2b))
* **module:** extract shutdown configuration resolver ([6903b30](https://github.com/johnnyhuirilef/toolkit/commit/6903b30f8d0837ddcbe19a957dd910cbd7ef0ff5))
* **module:** integrate shutdown service into module lifecycle ([c26fe82](https://github.com/johnnyhuirilef/toolkit/commit/c26fe82ac724c41cc55a69d4f9c4911d13a38027))
* **shutdown:** consolidate files from 6 to 2 ([8cb5bb4](https://github.com/johnnyhuirilef/toolkit/commit/8cb5bb44c1dbe4b0485536d78cdc1e5712a13ea0))
* **shutdown:** pass forceClose from config to wrapper at shutdown time ([a398aec](https://github.com/johnnyhuirilef/toolkit/commit/a398aecf49a7ac0270e877c6ed2fcbbd817f9d08))


### Tests

* **helpers:** add test helpers for shutdown scenarios ([bc4c5e1](https://github.com/johnnyhuirilef/toolkit/commit/bc4c5e129ca3858a5253b0f91c87157ab873db7a))

## [0.1.5](https://github.com/johnnyhuirilef/toolkit/compare/nest-ts-valid-mongodb-v0.1.4...nest-ts-valid-mongodb-v0.1.5) (2025-12-26)


### Bug Fixes

* **nest-ts-valid-mongodb:** ensure package assets are copied to dist correctly ([04ea613](https://github.com/johnnyhuirilef/toolkit/commit/04ea613556cd4c0e95aee1d3aacc8691c9a60623))
* revert version to 0.1.4 in package.json and changelog ([ea2c438](https://github.com/johnnyhuirilef/toolkit/commit/ea2c438036c86260a7bfd3c03a8b7c6e948a3c0a))


### Miscellaneous

* **main:** release nest-ts-valid-mongodb 0.1.5 ([2ff2ad8](https://github.com/johnnyhuirilef/toolkit/commit/2ff2ad8ef8d7450852b4de1bbef5321007b038b8))
* **main:** release nest-ts-valid-mongodb 0.1.5 ([03de9a9](https://github.com/johnnyhuirilef/toolkit/commit/03de9a917c7c2e8d28d8328a59305896f3c7fbe2))
* **main:** release nest-ts-valid-mongodb 0.1.5 ([61a4733](https://github.com/johnnyhuirilef/toolkit/commit/61a47332dd7ac02ae78b2c771d12b8b0ffbef8de))
* **main:** release nest-ts-valid-mongodb 0.1.5 ([24f9990](https://github.com/johnnyhuirilef/toolkit/commit/24f9990324e5c8e7e41bbde9f5fb3370fcd20433))
* revert version bump to re-trigger release ([5343858](https://github.com/johnnyhuirilef/toolkit/commit/5343858ba1a5da8423816f46614b5cb99c5425db))


### Documentation

* **nest-ts-valid-mongodb:** add acknowledgments to ts-valid-mongodb ([96efd7c](https://github.com/johnnyhuirilef/toolkit/commit/96efd7c75ea0607446456a0aadcddf0942a2bc77))

## [0.1.4](https://github.com/johnnyhuirilef/toolkit/compare/nest-ts-valid-mongodb-v0.1.3...nest-ts-valid-mongodb-v0.1.4) (2025-12-24)

### Bug Fixes

- **nest-ts-valid-mongodb:** add troubleshooting note about directConnection
  ([1cf7338](https://github.com/johnnyhuirilef/toolkit/commit/1cf7338769039b1ee105d73f22d85ba37a7675ff))

## [0.1.3](https://github.com/johnnyhuirilef/toolkit/compare/nest-ts-valid-mongodb-v0.1.2...nest-ts-valid-mongodb-v0.1.3) (2025-12-24)

### Bug Fixes

- **nest-ts-valid-mongodb:** update documentation to align with package description
  ([1c6db06](https://github.com/johnnyhuirilef/toolkit/commit/1c6db066f68592e22bf4607bc9d3c0f8e6ca9126))

## [0.1.2](https://github.com/johnnyhuirilef/toolkit/compare/nest-ts-valid-mongodb-v0.1.1...nest-ts-valid-mongodb-v0.1.2) (2025-12-24)

### Bug Fixes

- Fix error message formatting for MongoDB connection
  ([341643b](https://github.com/johnnyhuirilef/toolkit/commit/341643b00e9a97aaf1d5fcdf6d25befa87bbb647))

## [0.1.1](https://github.com/johnnyhuirilef/toolkit/compare/nest-ts-valid-mongodb-v0.1.0...nest-ts-valid-mongodb-v0.1.1) (2025-12-24)

### Bug Fixes

- update author name in package.json
  ([54b1293](https://github.com/johnnyhuirilef/toolkit/commit/54b129323cc4498775320094d1374c549e7aacf0))

## [0.1.0](https://github.com/johnnyhuirilef/toolkit/compare/nest-ts-valid-mongodb-v0.0.1...nest-ts-valid-mongodb-v0.1.0) (2025-12-24)

### Features

- **nest-ts-valid-mongodb:** initial release ready for production
  ([2258968](https://github.com/johnnyhuirilef/toolkit/commit/2258968adaaad721ed001e0dd997f47fe9ceea78))

## Changelog

All notable changes to this project will be documented in this file.

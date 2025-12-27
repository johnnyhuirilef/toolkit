# Changelog

## [0.2.0](https://github.com/johnnyhuirilef/toolkit/compare/nest-ts-valid-mongodb-v0.1.5...nest-ts-valid-mongodb-v0.2.0) (2025-12-27)


### Features

* **constants:** add default shutdown configuration constants ([fac2c10](https://github.com/johnnyhuirilef/toolkit/commit/fac2c10cc742a5aa84f31244923d4a9e5862cb9e))
* **guards:** add type guard for connection wrapper validation ([42a4094](https://github.com/johnnyhuirilef/toolkit/commit/42a40942399a657a1767789c03001fd2250e1b75))
* **shutdown:** add connection close orchestrator ([c74bd75](https://github.com/johnnyhuirilef/toolkit/commit/c74bd751bb3470aad9eb6c539c9ef91580aef989))
* **shutdown:** add retry utility for connection close ([904cddb](https://github.com/johnnyhuirilef/toolkit/commit/904cddb3a139c019e298a8b496ebe5f683975e65))
* **shutdown:** add structured logger for shutdown events ([200f0f5](https://github.com/johnnyhuirilef/toolkit/commit/200f0f5ab34750741fe335d18b8a28dcefbb78ff))
* **shutdown:** add timeout wrapper utility ([f97a543](https://github.com/johnnyhuirilef/toolkit/commit/f97a543952a3d84ef4c9124a168e94cce0a4bebc))
* **types:** add shutdown configuration types ([1ed54eb](https://github.com/johnnyhuirilef/toolkit/commit/1ed54eba56919a18d864f19ffa8b8527604ee2b5))


### Bug Fixes

* **module:** inject user options for shutdown configuration ([8c81d64](https://github.com/johnnyhuirilef/toolkit/commit/8c81d6490c8edb98bdd60720e2adf0983c226f65))
* **module:** pass forceClose parameter to native client close ([47920a4](https://github.com/johnnyhuirilef/toolkit/commit/47920a4d059b82e8f9deaad686961cfe7f331119))
* revert version to 0.1.4 in package.json and changelog ([f9cfcaa](https://github.com/johnnyhuirilef/toolkit/commit/f9cfcaab1044d49c2a5fcb0e65110040b40b2f1a))


### Miscellaneous

* **main:** release nest-ts-valid-mongodb 0.1.5 ([547134f](https://github.com/johnnyhuirilef/toolkit/commit/547134f746224c1dd3813ce53c1639d2fc26db81))
* **main:** release nest-ts-valid-mongodb 0.1.5 ([7c82810](https://github.com/johnnyhuirilef/toolkit/commit/7c82810ecf2db10928ec2033b5559ad5b744ce81))
* **main:** release nest-ts-valid-mongodb 0.1.5 ([73ed5c6](https://github.com/johnnyhuirilef/toolkit/commit/73ed5c63dc37bb7a03ebd7493291ca4ced3a0483))
* **main:** release nest-ts-valid-mongodb 0.1.5 ([7a42527](https://github.com/johnnyhuirilef/toolkit/commit/7a42527353787d42a8e3d27f6b0c5413da79f036))
* revert version bump to re-trigger release ([e258c7d](https://github.com/johnnyhuirilef/toolkit/commit/e258c7d7bf02951c4b4b0cf91b3c92676c9c2003))


### Documentation

* **examples:** add enableShutdownHooks to basic example ([129d23b](https://github.com/johnnyhuirilef/toolkit/commit/129d23bbd1d7c0e604bbe8089be2bb304b9593ce))
* **readme:** add configuration notes and logging recommendations ([84e366f](https://github.com/johnnyhuirilef/toolkit/commit/84e366fbc9a98782991ff332b9f924380deab0b2))
* **readme:** add graceful shutdown section with configuration and examples ([af51dc8](https://github.com/johnnyhuirilef/toolkit/commit/af51dc81d0f50841bc2c4964a85d4cc4b376d538))
* **readme:** improve graceful shutdown documentation and clarify forceShutdown behavior ([1361670](https://github.com/johnnyhuirilef/toolkit/commit/1361670ead4f7d831ac4f383026c260f6c9e514c))


### Code Refactoring

* **guards:** move guards to shutdown utils ([3d748d9](https://github.com/johnnyhuirilef/toolkit/commit/3d748d92f83444fd8ef9c7d71676601dda255776))
* **module:** change lifecycle hook to OnApplicationShutdown ([860424c](https://github.com/johnnyhuirilef/toolkit/commit/860424c80bf6b2aadb0bff851b54defa40e68bfe))
* **module:** extract onModuleDestroy to dedicated service ([ce5a49a](https://github.com/johnnyhuirilef/toolkit/commit/ce5a49a71728bc6ed7aef5105b55b1e0343af708))
* **module:** extract shutdown configuration resolver ([0fc9a60](https://github.com/johnnyhuirilef/toolkit/commit/0fc9a60f2a35fec119d0c8dd1966f6006b930da0))
* **module:** integrate shutdown service into module lifecycle ([4c8fdd5](https://github.com/johnnyhuirilef/toolkit/commit/4c8fdd535aab5e351ef773fcbc36684d5577a834))
* **shutdown:** consolidate files from 6 to 2 ([6b1aaa9](https://github.com/johnnyhuirilef/toolkit/commit/6b1aaa9628a1815fc4ca038059a5cb321fc8aa64))
* **shutdown:** pass forceClose from config to wrapper at shutdown time ([f7c1356](https://github.com/johnnyhuirilef/toolkit/commit/f7c1356363f1d945c4c085a79472f14d8264de91))


### Tests

* **helpers:** add test helpers for shutdown scenarios ([29e62a3](https://github.com/johnnyhuirilef/toolkit/commit/29e62a3815468b72daa6dd9b33b070fda484e017))

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

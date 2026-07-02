# Changelog

## [0.5.1](https://github.com/johnnyhuirilef/toolkit/compare/nest-mongo-v0.5.0...nest-mongo-v0.5.1) (2026-07-02)


### Bug Fixes

* **nest-zod-mongo:** stop leaking raw driver errors in health checks ([#86](https://github.com/johnnyhuirilef/toolkit/issues/86)) ([c54b485](https://github.com/johnnyhuirilef/toolkit/commit/c54b4859458f466f5da3ea51cfb8661b1a78f020)), closes [#64](https://github.com/johnnyhuirilef/toolkit/issues/64)
* upsert id error propagation, peer range, license ([#74](https://github.com/johnnyhuirilef/toolkit/issues/74)) ([7555a39](https://github.com/johnnyhuirilef/toolkit/commit/7555a3932373f77fe9d6e53498b8a13400b15322)), closes [#59](https://github.com/johnnyhuirilef/toolkit/issues/59)


### Miscellaneous

* enforce test conventions with lint rule and duplicate removal ([#80](https://github.com/johnnyhuirilef/toolkit/issues/80)) ([b7a5d58](https://github.com/johnnyhuirilef/toolkit/commit/b7a5d584cd85936f7a1f0afd021e077bea89288a))


### Documentation

* add SECURITY.md and NoSQL injection guidance for unvalidated filters ([#85](https://github.com/johnnyhuirilef/toolkit/issues/85)) ([9678a67](https://github.com/johnnyhuirilef/toolkit/commit/9678a67cc5f3a2ff3eae0678e69bf39b2741f1e6))


### Code Refactoring

* **nest-zod-mongo:** narrow shutdown manager to a ClientResolver port ([#90](https://github.com/johnnyhuirilef/toolkit/issues/90)) ([91edeac](https://github.com/johnnyhuirilef/toolkit/commit/91edeaca60f3a15b1cf79e8ebcb9fc42f764d4c5)), closes [#78](https://github.com/johnnyhuirilef/toolkit/issues/78)


### Tests

* **nest-zod-mongo:** unit-test shutdown manager error branches ([#79](https://github.com/johnnyhuirilef/toolkit/issues/79)) ([792d8f0](https://github.com/johnnyhuirilef/toolkit/commit/792d8f0acfeb8a1e12fe251ee923d97b0bb10b3c)), closes [#60](https://github.com/johnnyhuirilef/toolkit/issues/60)

## [0.5.0](https://github.com/johnnyhuirilef/toolkit/compare/nest-mongo-v0.4.0...nest-mongo-v0.5.0) (2026-06-29)


### Features

* **nest-zod-mongo:** add MongoTransactionService and MongoTransactionModule ([#47](https://github.com/johnnyhuirilef/toolkit/issues/47)) ([#53](https://github.com/johnnyhuirilef/toolkit/issues/53)) ([b02e838](https://github.com/johnnyhuirilef/toolkit/commit/b02e838a7b41739cc96466f7d9ea22370c856f4c))


### Documentation

* update READMEs — badges, Node 22, Acknowledgements, legacy package ([#56](https://github.com/johnnyhuirilef/toolkit/issues/56)) ([3af9517](https://github.com/johnnyhuirilef/toolkit/commit/3af9517a3b00730b0247ddedae767a078c02dc21))

## [0.4.0](https://github.com/johnnyhuirilef/toolkit/compare/nest-mongo-v0.3.0...nest-mongo-v0.4.0) (2026-06-29)


### Features

* **nest-zod-mongo:** add optional MongoHealthIndicator for @nestjs/terminus ([#41](https://github.com/johnnyhuirilef/toolkit/issues/41)) ([b8293a0](https://github.com/johnnyhuirilef/toolkit/commit/b8293a0a3ad2c546d8a4c181691bb36be31c00e0))
* **zod-mongo:** add upsertById and upsertOne to Repository ([#38](https://github.com/johnnyhuirilef/toolkit/issues/38)) ([6a7817d](https://github.com/johnnyhuirilef/toolkit/commit/6a7817d1aeb6877d1792d547e7f66b2cb50d4437))


### Tests

* **nest-zod-mongo:** add cross-provider inject coverage for forRootAsync ([#40](https://github.com/johnnyhuirilef/toolkit/issues/40)) ([0368a64](https://github.com/johnnyhuirilef/toolkit/commit/0368a6442220735217ad40b42f5c5a5f6c42ed9b))

## [0.3.0](https://github.com/johnnyhuirilef/toolkit/compare/nest-mongo-v0.2.0...nest-mongo-v0.3.0) (2026-06-25)


### Features

* **nest-mongo:** rename ZodMongo* exports to Mongo* for brand consistency ([99e1426](https://github.com/johnnyhuirilef/toolkit/commit/99e142603eeffa7a225b5c14db62ea4531f84909))


### Documentation

* **nest-mongo:** update README with renamed MongoModule API ([b910124](https://github.com/johnnyhuirilef/toolkit/commit/b910124359a458970b77af6e98b419b6b2830749))

## [0.2.0](https://github.com/johnnyhuirilef/toolkit/compare/nest-mongo-v0.1.0...nest-mongo-v0.2.0) (2026-06-25)


### Features

* add @wenu/mongo and @wenu/nest-mongo packages ([#17](https://github.com/johnnyhuirilef/toolkit/issues/17)) ([8635018](https://github.com/johnnyhuirilef/toolkit/commit/8635018605ab53468feb0257173e39126cecdcb2))


### Bug Fixes

* **nest-mongo:** update @wenu/mongo peer dep to 0.2.4, broaden zod range, add funding and keywords ([3a066f2](https://github.com/johnnyhuirilef/toolkit/commit/3a066f2a0f80111593f94a1c70cd9c18d82e5904))

# Changelog

## [0.4.2](https://github.com/johnnyhuirilef/toolkit/compare/mongo-v0.4.1...mongo-v0.4.2) (2026-07-10)


### Bug Fixes

* **zod-mongo:** stop silently corrupting _id for the 'string' id strategy ([#93](https://github.com/johnnyhuirilef/toolkit/issues/93)) ([8e193bd](https://github.com/johnnyhuirilef/toolkit/commit/8e193bd30a02a33e52838fd50d239715522ca1b1))

## [0.4.1](https://github.com/johnnyhuirilef/toolkit/compare/mongo-v0.4.0...mongo-v0.4.1) (2026-07-02)


### Bug Fixes

* **nest-zod-mongo:** stop leaking raw driver errors in health checks ([#86](https://github.com/johnnyhuirilef/toolkit/issues/86)) ([c54b485](https://github.com/johnnyhuirilef/toolkit/commit/c54b4859458f466f5da3ea51cfb8661b1a78f020)), closes [#64](https://github.com/johnnyhuirilef/toolkit/issues/64)
* upsert id error propagation, peer range, license ([#74](https://github.com/johnnyhuirilef/toolkit/issues/74)) ([7555a39](https://github.com/johnnyhuirilef/toolkit/commit/7555a3932373f77fe9d6e53498b8a13400b15322)), closes [#59](https://github.com/johnnyhuirilef/toolkit/issues/59)
* **zod-mongo:** map driver network failures to DbErrorKind 'connection' ([#84](https://github.com/johnnyhuirilef/toolkit/issues/84)) ([c53c77c](https://github.com/johnnyhuirilef/toolkit/commit/c53c77c3f4cb922650320a2b51e4c697b8ef56a0)), closes [#65](https://github.com/johnnyhuirilef/toolkit/issues/65)


### Miscellaneous

* enforce test conventions with lint rule and duplicate removal ([#80](https://github.com/johnnyhuirilef/toolkit/issues/80)) ([b7a5d58](https://github.com/johnnyhuirilef/toolkit/commit/b7a5d584cd85936f7a1f0afd021e077bea89288a))
* fix stale docs and drop dead rollup config ([#87](https://github.com/johnnyhuirilef/toolkit/issues/87)) ([ea4418d](https://github.com/johnnyhuirilef/toolkit/commit/ea4418d7a01ecff891db4ec2adc9bc3729221bd6)), closes [#66](https://github.com/johnnyhuirilef/toolkit/issues/66)


### Documentation

* add SECURITY.md and NoSQL injection guidance for unvalidated filters ([#85](https://github.com/johnnyhuirilef/toolkit/issues/85)) ([9678a67](https://github.com/johnnyhuirilef/toolkit/commit/9678a67cc5f3a2ff3eae0678e69bf39b2741f1e6))


### Code Refactoring

* **zod-mongo:** narrow driver dependencies to structural types ([#89](https://github.com/johnnyhuirilef/toolkit/issues/89)) ([a64dcdd](https://github.com/johnnyhuirilef/toolkit/commit/a64dcdd3f583f30789b133b39942a347308f6cd0)), closes [#82](https://github.com/johnnyhuirilef/toolkit/issues/82)


### Tests

* **zod-mongo:** add dedicated unit coverage for write, delete, and aggregate paths ([#77](https://github.com/johnnyhuirilef/toolkit/issues/77)) ([1ff1500](https://github.com/johnnyhuirilef/toolkit/commit/1ff1500ed488678b93d4dc3e3fe23de466fc852c)), closes [#67](https://github.com/johnnyhuirilef/toolkit/issues/67)

## [0.4.0](https://github.com/johnnyhuirilef/toolkit/compare/mongo-v0.3.0...mongo-v0.4.0) (2026-06-29)


### Features

* **zod-mongo:** add FindOptions to reads and driver options to updates ([#42](https://github.com/johnnyhuirilef/toolkit/issues/42) [#45](https://github.com/johnnyhuirilef/toolkit/issues/45)) ([#48](https://github.com/johnnyhuirilef/toolkit/issues/48)) ([a0cebca](https://github.com/johnnyhuirilef/toolkit/commit/a0cebca7076afbc20724030062585508daa5757c))
* **zod-mongo:** add query() composable read builder ([#44](https://github.com/johnnyhuirilef/toolkit/issues/44)) ([#51](https://github.com/johnnyhuirilef/toolkit/issues/51)) ([d3debd5](https://github.com/johnnyhuirilef/toolkit/commit/d3debd5f410830a7d7fd80c2dfe34ebe343349ea))
* **zod-mongo:** add session() proxy for ClientSession threading ([#46](https://github.com/johnnyhuirilef/toolkit/issues/46)) ([#52](https://github.com/johnnyhuirilef/toolkit/issues/52)) ([396ebfc](https://github.com/johnnyhuirilef/toolkit/commit/396ebfcfd8ba1411842a790cd8d1c91919e58d14))
* **zod-mongo:** add updateRaw for atomic MongoDB operations ([#50](https://github.com/johnnyhuirilef/toolkit/issues/50)) ([119354f](https://github.com/johnnyhuirilef/toolkit/commit/119354f693593529bad20fe78e694d255fac960b))


### Documentation

* update READMEs — badges, Node 22, Acknowledgements, legacy package ([#56](https://github.com/johnnyhuirilef/toolkit/issues/56)) ([3af9517](https://github.com/johnnyhuirilef/toolkit/commit/3af9517a3b00730b0247ddedae767a078c02dc21))

## [0.3.0](https://github.com/johnnyhuirilef/toolkit/compare/mongo-v0.2.4...mongo-v0.3.0) (2026-06-28)


### Features

* **zod-mongo:** add count and exists methods to Repository ([#37](https://github.com/johnnyhuirilef/toolkit/issues/37)) ([021fb7c](https://github.com/johnnyhuirilef/toolkit/commit/021fb7c35705ee8863b149381546ea7f2cbad687)), closes [#31](https://github.com/johnnyhuirilef/toolkit/issues/31)
* **zod-mongo:** add upsertById and upsertOne to Repository ([#38](https://github.com/johnnyhuirilef/toolkit/issues/38)) ([6a7817d](https://github.com/johnnyhuirilef/toolkit/commit/6a7817d1aeb6877d1792d547e7f66b2cb50d4437))


### Bug Fixes

* **zod-mongo:** broaden mongodb peer dep to &gt;=5.0.0 ([47bf9b3](https://github.com/johnnyhuirilef/toolkit/commit/47bf9b322d2fc60911513163802770d0a9df0fa6)), closes [#34](https://github.com/johnnyhuirilef/toolkit/issues/34)


### Code Refactoring

* **zod-mongo:** replace try/catch in parseSchema with tryit ([f3afb21](https://github.com/johnnyhuirilef/toolkit/commit/f3afb213feaa346e0775d2bed0c11b571c4bd6ff)), closes [#31](https://github.com/johnnyhuirilef/toolkit/issues/31)


### Tests

* **zod-mongo:** add missing ID strategy coverage + validate ZodCompat _id ([#29](https://github.com/johnnyhuirilef/toolkit/issues/29)) ([57ab0af](https://github.com/johnnyhuirilef/toolkit/commit/57ab0af23462bf9d2d25f48ade606c58e86c4772))

## [0.2.4](https://github.com/johnnyhuirilef/toolkit/compare/mongo-v0.2.3...mongo-v0.2.4) (2026-06-25)


### Bug Fixes

* **zod-mongo:** declare zod peer dep as required in peerDependenciesMeta ([2ed070b](https://github.com/johnnyhuirilef/toolkit/commit/2ed070b14ed8a984ca1c58ee0b6ce4dd4ebed2d4))

## [0.2.3](https://github.com/johnnyhuirilef/toolkit/compare/mongo-v0.2.2...mongo-v0.2.3) (2026-06-25)


### Bug Fixes

* **zod-mongo:** broaden zod peer dependency to support zod v5 ([6b6a3c6](https://github.com/johnnyhuirilef/toolkit/commit/6b6a3c6e4596d71331b9f7440d25167d21d3e53f))

## [0.2.2](https://github.com/johnnyhuirilef/toolkit/compare/mongo-v0.2.1...mongo-v0.2.2) (2026-06-25)


### Bug Fixes

* **zod-mongo:** add funding field to package metadata ([ff4e95f](https://github.com/johnnyhuirilef/toolkit/commit/ff4e95fd1dea3bd0b48a523fe2d8185fb56af092))

## [0.2.1](https://github.com/johnnyhuirilef/toolkit/compare/mongo-v0.2.0...mongo-v0.2.1) (2026-06-25)


### Bug Fixes

* **zod-mongo:** add missing npm keywords for discoverability ([f52dc3d](https://github.com/johnnyhuirilef/toolkit/commit/f52dc3da7243ce4077347348d076f6477084220c))

## [0.2.0](https://github.com/johnnyhuirilef/toolkit/compare/mongo-v0.1.0...mongo-v0.2.0) (2026-06-25)


### Features

* add @wenu/mongo and @wenu/nest-mongo packages ([#17](https://github.com/johnnyhuirilef/toolkit/issues/17)) ([8635018](https://github.com/johnnyhuirilef/toolkit/commit/8635018605ab53468feb0257173e39126cecdcb2))

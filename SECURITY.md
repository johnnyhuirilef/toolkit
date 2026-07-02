# Security Policy

## Supported Versions

Only the latest minor release of each package receives security fixes.

| Package            | Supported version |
| ------------------ | ----------------- |
| `@wenu/mongo`      | 0.4.x             |
| `@wenu/nest-mongo` | 0.5.x             |

Older minor versions are not patched — upgrade to the latest minor to receive fixes.

`@ioni/nest-ts-valid-mongodb` is a legacy package, no longer actively developed, and is not covered
by this policy.

## Reporting a Vulnerability

Please report security vulnerabilities privately using
[GitHub Security Advisories](https://github.com/johnnyhuirilef/toolkit/security/advisories/new) on
this repository. Do not open a public issue for security reports.

You should receive an initial response within a few days. Once a fix is available, it will be
released and the advisory will be published with credit to the reporter (unless anonymity is
requested).

## Trust Boundary: Filters and Raw Updates Are Not Validated

`@wenu/mongo` (and by extension `@wenu/nest-mongo`) validates **documents** with Zod on every insert
and update. It does **not** validate the shape of MongoDB **filters** or `updateRaw` operators —
`Filter<Doc>` and `UpdateFilter<Doc>` objects passed to `find`, `findOne`, `count`, `exists`,
`updateOne`, `updateMany`, `deleteMany`, `query().filter()`, and `updateRaw` are forwarded to the
driver as-is.

This is a deliberate design choice — validating arbitrary filter shapes would require a parallel
schema system for MongoDB query operators. It also means that passing untrusted input (request
bodies, query strings) directly as a filter or update is a classic
[NoSQL operator injection](https://owasp.org/www-community/Injection_Flaws) vector, for example
`{ password: { $ne: null } }` or `$where` payloads.

Both package READMEs document how to avoid this:

- [`@wenu/mongo` — Security](packages/zod-mongo/README.md#security)
- [`@wenu/nest-mongo` — Security](packages/nest-zod-mongo/README.md#security)

The short version: never spread request bodies or query params into a filter or update object —
allow-list keys explicitly or build filters as code.

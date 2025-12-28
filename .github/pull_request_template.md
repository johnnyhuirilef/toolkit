# 📥 Pull Request

## 📌 Context & Purpose

<!-- Link to the Issue (e.g. "Fixes #123") or describe the motivation behind this change. -->
<!-- Why is this change necessary? What problem does it solve? -->

## 📦 Affected Packages

<!-- Which packages in the monorepo are affected? -->

- [ ] `nest-ts-valid-mongodb`
- [ ] `examples/*`
- [ ] `docs`
- [ ] Infrastructure (CI, Build, Tooling)

## 🚦 SemVer Type

<!-- Based on your "Conventional Commits", what type of release is this? -->

- [ ] 🐞 **Patch** (Bug fix, non-breaking change)
- [ ] ✨ **Minor** (New feature, non-breaking change)
- [ ] 💥 **Major** (Breaking change - requires migration guide)
- [ ] 🧾 **Skip Release** (Docs, Chore, Refactor, Test)

## 🛠️ Implementation Details

<!-- Technical explanation of the solution. -->
<!-- Did you introduce any new dependencies? Did you modify the public API? -->

## 💥 Breaking Changes

<!-- If this PR introduces a breaking change, please describe the impact and a migration path for existing applications. -->
<!-- If none, leave empty. -->

## ✅ Checklist

<!-- Mark completed items -->

- [ ] 🧹 **Linting**: I have run `pnpm nx affected -t lint` and fixed all errors.
- [ ] 🧪 **Tests**: I have run `pnpm nx affected -t test` and all tests pass.
- [ ] 🧟 **Mutation Testing**: (Optional) I ran Stryker on the modified logic.
- [ ] 📝 **Docs**: I have updated TSDoc comments and/or README files.
- [ ] 🔏 **Commits**: My commit messages follow the
      [Conventional Commits](https://www.conventionalcommits.org/) standard.

## 📸 Visuals / Diagrams

<!-- If applicable (e.g., console output, architecture diagrams). -->

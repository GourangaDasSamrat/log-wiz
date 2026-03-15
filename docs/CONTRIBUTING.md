# Contributing to log-wiz

Thank you for taking the time to contribute! 🎉
This document covers everything you need to go from zero to a merged pull request.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Coding Standards](#coding-standards)
- [Releasing](#releasing)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md).
By participating you agree to uphold it. Please report unacceptable behaviour to
[gouranga.samrat@gmail.com](mailto:gouranga.samrat@gmail.com).

---

## Ways to Contribute

You do not need to write code to contribute:

- 🐛 **Report a bug** — [open an issue](https://github.com/GourangaDasSamrat/log-wiz/issues/new?template=bug_report.md)
- 💡 **Suggest a feature** — [open a discussion](https://github.com/GourangaDasSamrat/log-wiz/discussions)
- 📖 **Improve docs** — fix typos, add examples, clarify unclear sections
- 🔍 **Review pull requests** — feedback from users is always valuable
- ⭐ **Star the repo** — helps others discover the project

---

## Development Setup

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| Node.js | 18.x |
| npm | 9.x |
| Git | 2.x |

### Steps

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/log-wiz.git
cd log-wiz

# 2. Install dependencies (zero runtime deps — only devDependencies)
npm install

# 3. Verify everything works
npm test
npm run build
```

---

## Project Structure

```
log-wiz/
├── src/
│   ├── types/         # All TypeScript interfaces and type definitions
│   ├── core/          # Wiz class — the main logger
│   ├── transports/    # Console (pretty/json/browser) and file transports
│   └── utils/         # Masker, error-parser, timestamp, env detection
├── tests/
│   ├── unit/          # Unit tests per module
│   └── integration/   # Integration tests (real disk I/O)
├── examples/          # Runnable usage examples
├── docs/              # Markdown documentation
└── .github/workflows/ # CI (ci.yml) and publish (publish.yml)
```

---

## Making Changes

### 1. Create a branch

```bash
# Branch naming: <type>/<short-description>
git checkout -b fix/masker-circular-ref
git checkout -b feat/log-sampling
git checkout -b docs/transport-examples
```

### 2. Write your code

- All source lives in `src/` — TypeScript only, no plain JS
- Every new feature needs tests in `tests/unit/` or `tests/integration/`
- Every bug fix needs a regression test that fails before your fix
- Keep functions small and single-purpose
- Prefer explicit types over `any` — ESLint will flag unnecessary assertions

### 3. Run the full check suite locally

```bash
npm run lint          # ESLint — must pass with 0 errors
npm run format:check  # Prettier — must pass
npm test              # Jest — all 76+ tests must pass
npm run build         # TypeScript — must compile cleanly across all 4 targets
```

A quick one-liner that mirrors the CI pipeline:

```bash
npm run lint && npm test && npm run build
```

---

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/).
Every commit message must follow the format:

```
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `refactor` | Code change that is neither a fix nor a feature |
| `perf` | Performance improvement |
| `chore` | Maintenance (deps, config, tooling) |
| `ci` | CI/CD pipeline changes |

### Scopes

Use the module name: `masker`, `transports`, `core`, `file`, `types`, `docs`, `ci`, `deps`.

### Examples

```
feat(masker): add configurable mask replacement string
fix(transports): prevent duplicate entries in async buffer flush
docs(getting-started): add Express.js integration example
test(masker): add regression test for deeply nested arrays
chore(deps): bump typescript from 5.4.5 to 5.5.2
ci(publish): add dry-run step before npm publish
```

### Breaking changes

Add `!` after the type/scope and a `BREAKING CHANGE:` footer:

```
feat(core)!: rename WizOptions to WizConfig

BREAKING CHANGE: The configuration interface has been renamed from
WizOptions to WizConfig. Update all import statements accordingly.
```

---

## Pull Request Process

1. **Open an issue first** for significant changes — alignment before code saves time.
2. **Keep PRs focused** — one logical change per PR makes review easier.
3. **Fill in the PR template** — describe what changed and why.
4. **Ensure CI is green** — all checks must pass before review.
5. **Respond to review feedback** — address comments or explain your reasoning.
6. **Squash on merge** — maintainers will squash commits to keep history clean.

### PR title format

PR titles follow the same Conventional Commits format as commit messages:

```
fix(masker): prevent RangeError on deeply nested circular objects
feat(transports): add Seq structured-log transport
```

---

## Testing

### Running tests

```bash
npm test                  # run all tests once
npm run test:watch        # watch mode — reruns on file change
npm run test:coverage     # with coverage report
```

### Coverage thresholds

| Metric | Minimum |
|--------|---------|
| Statements | 80% |
| Branches | 70% |
| Functions | 75% |
| Lines | 80% |

PRs that drop coverage below these thresholds will fail CI.

### Writing tests

- **Unit tests** go in `tests/unit/<module>.test.ts`
- **Integration tests** (file I/O, process signals) go in `tests/integration/`
- Use descriptive `describe` / `it` blocks — tests are documentation
- Mock `console.*` with `jest.spyOn` to avoid polluting test output
- Always restore mocks in `afterEach(() => jest.restoreAllMocks())`
- For `process.env` mutations, save and restore in `beforeEach` / `afterEach`

---

## Coding Standards

### TypeScript

- **Strict mode** is on — no implicit `any`, no unchecked indexing
- `exactOptionalPropertyTypes: true` — use conditional spreads for optional fields
- Avoid `as` casts where TypeScript can infer the type — ESLint will warn
- Prefer `readonly` for data that should not be mutated after construction

### Style

- Formatting is enforced by **Prettier** — run `npm run format` before committing
- Linting is enforced by **ESLint** — run `npm run lint:fix` to auto-fix where possible
- Use named exports — avoid default exports (except in test helpers)
- Keep files under ~150 lines — split when they grow larger

### Zero dependencies rule

log-wiz has **zero runtime dependencies** and this is a hard constraint.
Pull requests that add entries to `dependencies` in `package.json` will not be accepted.
`devDependencies` are fine.

---

## Releasing

Releases are handled by the maintainer via git tags. The publish workflow triggers
automatically when a tag matching `v*.*.*` is pushed.

```bash
# Maintainer only
git tag v1.1.0
git push origin v1.1.0
# → GitHub Actions runs tests, builds, publishes to npm, creates GitHub Release
```

Contributors do not need to manage releases.

---

## Questions?

Open a [GitHub Discussion](https://github.com/GourangaDasSamrat/log-wiz/discussions)
or reach out at [gouranga.samrat@gmail.com](mailto:gouranga.samrat@gmail.com).

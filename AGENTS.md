# AGENTS.md

This file is for coding agents working in this repository.

## First rule

Read the docs before making assumptions about the architecture or changing the structure.
Start here:

- [`README.md`](./README.md) — getting started, the commands, CI/CD and the deploy.
- [`docs/index.md`](./docs/index.md) — every doc, one line each.
- [`docs/monorepo.md`](./docs/monorepo.md) — the workspace layout and how to add an app or a package.
- [`docs/api/style-guide/index.md`](./docs/api/style-guide/index.md) — read it before changing `apps/backend`.

## Workspace overview

Yarn 4 workspaces run by Turborepo. Node 22 (22.18 or later, from `.nvmrc`) runs the tooling
and the tests; Bun is the runtime for the API only; Expo builds the native app.

### Apps

| App               | Path           | Framework                | Runtime         |
| ----------------- | -------------- | ------------------------ | --------------- |
| `@medusa/backend` | `apps/backend` | Hono 4                   | Bun             |
| `@medusa/native`  | `apps/native`  | Expo SDK 57, Expo Router | iOS and Android |

### Packages

| Package                 | Path                     | Framework               | Runtime                |
| ----------------------- | ------------------------ | ----------------------- | ---------------------- |
| `@medusa/eslint-plugin` | `packages/eslint-plugin` | ESLint 9 rules (plugin) | Node, loaded by ESLint |

Every package exports its TypeScript source; there is no build step.

## Documentation map

- [`docs/monorepo.md`](./docs/monorepo.md) — layout, apps vs packages, source-first exports, adding a workspace.
- [`docs/api/style-guide/index.md`](./docs/api/style-guide/index.md) — the API's routes, use cases, tests and production rules.
- [`docs/expo/style-guide/index.md`](./docs/expo/style-guide/index.md) — the native app's structure, components, hooks, context, state and tests.
- [`apps/native/README.md`](./apps/native/README.md) — running the native app on a phone, its env file and its layout.
- [`apps/backend/src/services/api/http/README.md`](./apps/backend/src/services/api/http/README.md) — how the API's routes are laid out.
- [`docs/style-guide/index.md`](./docs/style-guide/index.md) — the index of the style guide.
- [`docs/style-guide/placement-rule.md`](./docs/style-guide/placement-rule.md) — where a unit lives, and what a module holds.
- [`docs/style-guide/imports.md`](./docs/style-guide/imports.md) — `@/`, `./`, never `../`, package subpaths.
- [`docs/style-guide/packages.md`](./docs/style-guide/packages.md) — when code becomes a package, and how it exports.
- [`docs/style-guide/third-party-integrations.md`](./docs/style-guide/third-party-integrations.md) — one folder per outside library.
- [`docs/style-guide/i18n.md`](./docs/style-guide/i18n.md) — where strings live, one file per domain, tests assert on keys.
- [`docs/style-guide/test-organization.md`](./docs/style-guide/test-organization.md) — where tests, mocks and factories live.
- [`docs/style-guide/test-quality.md`](./docs/style-guide/test-quality.md) — what a good test asserts, the anti-patterns.
- [`docs/style-guide/testing-patterns.md`](./docs/style-guide/testing-patterns.md) — each testing rule in a snippet.
- [`docs/typescript/conventions.md`](./docs/typescript/conventions.md) — type prefixes, names, dates with Luxon.
- [`docs/environment.md`](./docs/environment.md) — the environments, where each reads its values, every variable.
- [`docs/dependencies.md`](./docs/dependencies.md) — why each `resolutions` override exists.

## Skills

Skills live in [`.agents/skills`](./.agents/skills); `.claude/skills` links to the same folder.
Each one lists the docs to read and the rules that matter most.

- [`api`](./.agents/skills/api/SKILL.md) — read before changing a route, a use case, the config or the logger in `apps/backend`.
- [`native`](./.agents/skills/native/SKILL.md) — read before changing a route, a screen, a component, a hook, a store or a test in `apps/native`.
- [`testing`](./.agents/skills/testing/SKILL.md) — read before writing or changing a test, a mock or a factory.
- [`pr-description`](./.agents/skills/pr-description/SKILL.md) — read when asked for a PR description; it writes the text only.
- [`create-pr`](./.agents/skills/create-pr/SKILL.md) — read when asked to open a PR; it uses `pr-description` for the body.

## Repo expectations

- Follow the monorepo and style-guide rules before changing the structure.
- Place new code by the [placement rule](./docs/style-guide/placement-rule.md), not wherever is closest.
- Keep entry points, such as `apps/backend/src/services/api/index.ts`, in the shape their runtime expects.
- Branch from `dev` and open pull requests against `dev`; `stg` only receives promotions from `dev`.
- Do not add a `resolutions` entry without its row in [`docs/dependencies.md`](./docs/dependencies.md).
- Never commit secrets: no keys, tokens or `.env` files.

## Commands

From the repository root.

| Task                      | Command                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Typecheck all             | `yarn typecheck`                                                                                   |
| Typecheck one workspace   | `yarn workspace @medusa/backend typecheck`                                                         |
| Test                      | `yarn test`                                                                                        |
| Lint                      | `yarn lint`                                                                                        |
| Format (check)            | `yarn format`; `yarn format:write` to apply                                                        |
| Run the API in watch mode | `yarn dev`; `yarn dev --native` also starts the app's Metro                                        |
| Run the app on the iPhone | `yarn workspace @medusa/native ios --device` once, then `yarn dev --native`                        |
| Tests with coverage       | `yarn test:coverage`                                                                               |
| Fallow, with coverage     | `yarn fallow --fail-on-issues --coverage coverage/coverage-final.json`, after `yarn test:coverage` |

## Commits

- Messages follow [Conventional Commits](https://www.conventionalcommits.org): `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`.
- `yarn install` sets up a husky `commit-msg` hook that runs commitlint on every commit, and a `pre-commit` hook that runs format, lint, typecheck and test.
- CI checks every commit in a pull request, not only the last one, so a bad message anywhere in the branch fails the PR.

## Working style

- Change the docs in the same pull request as the architecture they describe.
- Verify with real commands — `yarn typecheck`, `yarn lint`, `yarn test` — and say which ones ran.
- Do not call scaffolding or placeholder code production-ready.

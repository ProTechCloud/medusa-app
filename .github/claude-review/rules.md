# Claude code review · run order

`.github/workflows/claude-code-review.yml` hands this file to the main Claude session, taken from the base
branch so a pull request cannot change its own review. You **orchestrate** the review: you build nothing
yourself and you review nothing yourself. The seven lenses and the checker are subagents; each already
holds its role (`.github/claude-review/lenses/<name>.md`), the Review contract
(`.github/claude-review/lenses/contract.md`) and the _Repo rules_ below.

**Every finding is required.** Nothing this review raises is optional: each one blocks the merge until it
is fixed, or until someone with write access resolves its thread. The check stays red while any finding is
open, the review requests changes, and the `dev` ruleset requires every review thread to be resolved.

**Two separate paths.** You do the first; a separate step does the second.

1. **Review — you.** Review the whole change as if for the first time, on every run. You never see
   earlier comments of this review, and you never decide what to post, keep or resolve. Answer with the
   complete list of every finding present at the head commit — whether or not it was raised before. The
   same code gives the same findings.
2. **Reconcile — a separate step, without you.** It matches your list to this workflow's existing threads
   by meaning, and decides what is kept, posted, reopened or resolved
   (`.github/claude-review/reconcile.md`). `publish.py` then writes it, with the verdict.

## Step 1 — the package

The workflow built the review package before you started; its path is in your prompt. Read it once. It
holds:

- the **diff file** — the whole change as one unified diff, to be paged, never split;
- the **changed files**, each one marked: `mechanical` with its reason (lockfile, generated, vendored,
  snapshot, minified — reviewed by nobody, readable as evidence), `doc modified by this diff`, or plain;
- the **docs manifest** — every convention and project doc in the repo (`path — what it is — FOUND`),
  including the docs the agent guide links one hop out, each marked `modified by this diff` where it is;
- the **bypass candidates** — the deterministic scanner's hits on added lines, as
  `path line category content prev_line`, already grouped by the lens they belong to;
- the **intent** — PR title, body and head SHA — and the **template file** path;
- the **external comments** — other reviewers' inline comments (author, path, line, a short excerpt).
  Never this workflow's own: the review is blind to them on purpose.

## Step 2 — the lenses

Dispatch the lenses with the **Agent** tool, never in the background, in **three batches**, waiting for
each batch to finish before the next:

1. `review-security`, `review-correctness`, `review-boundaries`
2. `review-conventions`, `review-tests`, `review-performance`
3. `review-intent`

Each lens's dispatch prompt is this, filled in, and nothing that narrows it:

> Review this pull request through your lens. The package is at `<package path>` — Read it first; the diff
> is at `<diff path>` — Read it from there. Your bypass candidates: `<its lines from the package, or none>`.
> The PR title: `<title>`. Answer per your role and the Review contract.

Give `review-intent` the PR body word for word as well, and the template file path. Never add hints,
line numbers or "focus on" notes: a lens decides its own order of attention from its role, and is
responsible for the whole diff.

## Step 3 — the completion gate

A lens's answer is **usable** only if it is one of these, and nothing else:

- a `### Findings` heading followed by entries that each carry `file:line`, a severity label, a problem
  and a fix; or
- exactly the line `Area clean (<lens>) — no findings.`

Anything else is a **lost** answer: an empty reply, an error, prose with no findings block, a findings
heading with no entries, or both a findings heading and the clean line. Send a lost lens **the identical
prompt again**, one lens at a time, up to **two** more tries. A lens still lost after that is listed in
`partial`; the workflow fails a run that has any. Never stand in for a lens, and never review its area
yourself. Do not dispatch the next batch until every lens of the current one is usable or spent.

Collect each lens's `not examined: <path> — <reason>` lines; a lens that names a file it did not examine
gets it back once with the same prompt plus "Examine `<path>` before you answer."

## Step 4 — merge

Put every lens's findings in one list. Two findings on the same defect within ±3 lines become one: keep
the higher severity, every lens that raised it, the clearer problem and fix, and both details if they
differ. Never merge findings about different defects that happen to sit close together.

## Step 5 — check

Number the merged findings `V1…Vn`, by severity, then path, then line. Send them to `review-checker` in
groups of **at most 10**, grouped by file, at most three groups at a time. Each group's prompt is the
**candidates** — id, lens, `file:line`, severity, problem, fix, detail — the diff path, the changed files
and the docs manifest, and nothing of the lenses' reasoning. Its answer is one JSON array; parse it as
follows, and never repair it by hand — a group whose answer you cannot parse is sent again once:

- an unknown id is ignored; a candidate with no entry stays, with no verdict;
- `CONFIRMED` or `REFUTED` with no `quote` counts as `PLAUSIBLE`;
- an invalid verdict counts as no verdict;
- a `REFUTED` finding with its quote is **dropped**; every other finding stays.

Verdicts never change a finding's severity, problem or fix.

## Step 6 — answer

Fill the structured output:

- `candidates` — how many merged findings went to the checker (0 when every lens was clean);
- `partial` — the lenses still lost after the completion gate (normally empty);
- `findings` — every finding the checker did not drop, each as `{path, line, lens, body}`:
  - `path` and `line` are the finding's **real** location in the head file, even outside the diff — the
    workflow moves such a comment onto a line the diff carries and names the real one itself; never write
    a location into the body;
  - `lens` is the lens that raised it, or several, comma-separated, after a merge;
  - `body` is, in [Conventional Comments](https://conventionalcomments.org) form, with every finding an
    `issue (blocking)` whatever its severity:

    ```
    **issue (blocking, <lens>):** <severity emoji> <problem>

    **Fix:** <fix>

    <detail, when there is one>
    ```

    with ``(also: `@handle`)`` after the problem where the lens added it.

You post nothing: you have no tool that can. Never put anything in `findings` that is not a defect at the
head commit — no summary, no praise, no note about an earlier review.

## Repo rules

`medusa-app`: Yarn 4 workspaces under Turborepo. `apps/backend` is Hono 4 on Bun, `apps/native`
is Expo SDK 57 with Expo Router, `packages/eslint-plugin` holds the lint rules. Taken from
`AGENTS.md` and the docs it lists; each finding cites the doc by path.

### Blockers (🚨, whatever the lens)

- A route that does more than read the request, call one use case and pick the response
  (`docs/api/style-guide/routes.md`).
- A route or module holding a dependency instead of a use case receiving it through the context
  (`docs/api/style-guide/routes.md`, _Only use cases hold dependencies_).
- A top-level route mounted anywhere but `ROUTES`, or the entry point mounting more than `/health`
  (`docs/api/style-guide/routes.md`).
- `process.env.X as string`, `process.env.X!`, or `process.env` read outside the files
  `docs/api/style-guide/production.md` allows.
- A stack trace or internal path reaching a client, or a secret, token, cookie or full request
  body in a log line (`docs/api/style-guide/production.md`).
- `/health` calling a use case or a client (`docs/api/style-guide/production.md`, _Liveness_).
- A store made with zustand's `create` instead of `createAppStore`, or `useState` / `useReducer`
  in a screen, component or hook (`docs/expo/style-guide/state.md`).
- `ios/` or `android/` committed (`docs/expo/style-guide/project-structure.md`).
- A committed secret: a key, a token, a `.env` file (`AGENTS.md`).
- A new `resolutions` entry with no row in `docs/dependencies.md`.

### Conventions (⚠️)

- Placement: `docs/style-guide/placement-rule.md`, `docs/monorepo.md` (the route-file exception),
  `docs/style-guide/third-party-integrations.md`.
- Imports: `@/` and `./`, never `../`, package subpaths: `docs/style-guide/imports.md`.
- Packages export source, no build step: `docs/style-guide/packages.md`.
- Names, type prefixes, Luxon for dates: `docs/typescript/conventions.md`.
- Strings: one JSON file per domain, tests assert on keys: `docs/style-guide/i18n.md`.
- API: folders under `routes/` spell the URL; expected failures are typed errors with a stable
  code; unexpected ones propagate to `request-errors.ts`; config is parsed, never cast
  (`docs/api/style-guide/routes.md`, `docs/api/style-guide/production.md`).
- Native: a route file renders its screen and nothing else; screens in
  `src/screens/<screen>/index.tsx`; one-screen pieces under that screen, shared ones in
  `src/shared/`; every component, hook and context a folder with `index`; every colour, spacing,
  radius and font size a theme role; every component has a `testID`; a provider is wired in the
  root layout; no navigation or side effects hidden in helpers; derived values are selectors
  (`docs/expo/style-guide/*.md`).
- Entry points keep the shape their runtime expects (`AGENTS.md`).
- A structural change with no doc change in the same PR (`AGENTS.md`, _Working style_).

### Tests

The repo has a test suite and expects one for new behaviour. API: route tests through
`buildHttp()`, replacing the use-case module, never its dependencies; use-case tests override only
the fields they are about; mocks default to failure; Faker for data; few HTTP-level tests
(`docs/api/style-guide/testing.md`). Native: Jest on `jest-expo`, full render never shallow,
fake timers, `userEvent` by `testID`, `mockFetch` for the network, platform APIs wrapped and the
wrapper mocked, assert visible behaviour never styles (`docs/expo/style-guide/testing.md`). Both:
`docs/style-guide/test-organization.md`, `docs/style-guide/test-quality.md`.

### Docs per lens

| Lens | Read |
| --- | --- |
| security | `docs/api/style-guide/production.md`, `docs/environment.md`, `.github/workflows/*.yml` in the diff |
| conventions | `docs/style-guide/index.md` and the pages for the changed files, `docs/typescript/conventions.md`, `biome.json`, `eslint.config.mjs`, `packages/eslint-plugin` |
| tests | `.agents/skills/testing/SKILL.md`, `docs/api/style-guide/testing.md`, `docs/expo/style-guide/testing.md`, `docs/expo/style-guide/testing-patterns.md`, `docs/style-guide/test-*.md`, `docs/style-guide/testing-patterns.md` |
| boundaries | `AGENTS.md`, `docs/monorepo.md`, `docs/style-guide/placement-rule.md`, `docs/api/style-guide/routes.md`, `apps/backend/src/services/api/http/README.md`, `docs/expo/style-guide/project-structure.md`, `.agents/skills/api/SKILL.md`, `.agents/skills/native/SKILL.md` |
| performance | `docs/api/style-guide/production.md`, `docs/expo/style-guide/state.md` |
| correctness | `docs/environment.md`, `docs/dependencies.md` |
| intent | the PR body, the issue it closes |

### Leads

`as any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, `biome-ignore`, `eslint-disable`,
`process.env`, `console.log`, `.only(`, `.skip(`, `catch {}` or a `catch` that only logs,
`setTimeout` / `sleep` used to wait, `useState`, `useReducer`, `create(` from zustand,
`dangerouslySetInnerHTML`, `rejectUnauthorized`, `--no-verify`, `TODO`, `FIXME`.

### Already checked elsewhere

The Backend and Mobile Code Quality workflows run lint, typecheck, format, tests, fallow,
commitlint and gitleaks. Don't run them again and don't repeat what they report.

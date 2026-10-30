# Routes

How the API in `apps/backend` answers a request: the route, the use case behind it, and the
errors in between. The folder rules, with a worked example of a nested path, are in the
[routes README](../../../apps/backend/src/services/api/http/README.md).

Paths below are under `apps/backend/src/`.

## A route reads the request, calls one use case and picks the response

Nothing else. The route validates the input, calls one use case, and chooses the status and
the response shape. Everything the API knows or does — config, logging, clients, decisions —
belongs to the use case in `use-cases/cases/`.

`services/api/http/routes/version/index.ts` is the shape:

```ts
export function createVersionRoutes(): Hono {
	return new Hono().get("/", async (context) =>
		context.json({ message: "Hello World", ...(await loadVersionUseCase()) }),
	);
}
```

A route that reads `getConfig()`, the logger or a client itself has taken work from a use
case. No lint rule checks this; review does.

## Folders under `routes/` spell the URL

`services/api/http/routes/version/` answers at `/version`. A route registers its handlers at
its own `/` and never repeats its path; a deeper path is a folder inside it.

`kebab-case-folders` in `@medusa/eslint-plugin` reports a folder under `src/` whose name is
not kebab-case, so a URL segment is always kebab-case too.

## `ROUTES` is the only place a route is mounted

`services/api/http/index.ts` holds the `ROUTES` table, and `buildHttp()` mounts each entry at
its path. A new route is a folder plus one line there:

```ts
const ROUTES: ReadonlyArray<{ path: string; create: () => Hono }> = [
	{ path: "/version", create: createVersionRoutes },
];
```

A route never mounts itself or a sibling, and the entry point never mounts a route.

## `/health` is the one path the entry point mounts

`services/api/index.ts` answers `GET` on `HEALTH_PATH`, from
`services/api/http/lib/health-path.ts`, before `buildHttp()`. It is liveness only, so it stays
outside `ROUTES` and calls no use case: see [Production](./production.md#liveness).

## Only use cases hold dependencies

`TUseCaseContext` in `use-cases/index.ts` is the one place the config, the logger and, as
they arrive, the clients live. A use case receives it as its first argument; callers never
see it:

```ts
export const loadVersionUseCase = defineUseCase<void, TVersion>(
	async function loadVersionUseCase(ctx) {
		const { service, version, commit, environment } = ctx.config;
		return { service, version, commit, environment };
	},
);
```

That is `use-cases/cases/load-version.use-case.ts`. A new client is a field on
`TUseCaseContext`, built in the entry point's builder; a route or a module never imports a
client of its own.

## Entry points call `initUseCaseContext` once, before serving

`initUseCaseContext` takes an async builder and builds the context at once, so a bad
environment or an unreachable client fails the boot rather than the first request. The entry
point awaits it before `Bun.serve`, as `services/api/index.ts` does:

```ts
const { config } = await initUseCaseContext(async () => ({
	config: getConfig(),
	logger,
}));
```

A later entry point, such as a job runner, does the same before it starts work.

## Expected failures are typed errors with a stable code

A failure the caller can act on — not found, not allowed, a conflict — is an error the use
case throws with a stable `code`, in snake_case. The route catches it and answers its status
with `{ error: code }`, the same shape as the 404 in `services/api/index.ts` and the 500 in
`services/api/http/lib/request-errors.ts`. The code is the contract; the message can change.
No use case has an expected failure yet, so the first one adds the error type beside the
use cases.

## Unexpected failures propagate to `request-errors.ts`

Anything else is not caught. `defineUseCase` logs it as `<name> failed` and rethrows it
unchanged, and `requestErrors` in `services/api/http/lib/request-errors.ts` logs it once with
the request and answers `500` with `{ error: "internal_error" }`. No message, stack or path
reaches the caller. A route never wraps a use case in `try`/`catch` to answer 500 itself.

## Small pure functions map internal shapes to responses

When a response differs from what the use case returns, a small pure function in the route's
folder maps one to the other: no I/O, no context, easy to test on its own. Prefer a function
to a class. Today the version route only spreads the use case's result, so it has none.

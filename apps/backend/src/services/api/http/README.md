# HTTP routes

Every route the API serves lives under `routes/`. The entry point,
[`../index.ts`](../index.ts), adds what applies to every request: the request logger, the
health check at `HEALTH_PATH`, the JSON 404 and the 500 from `lib/request-errors.ts`.

## Rules

1. **Folders spell the URL.** `routes/version/` answers at `/version`; a route's path is
   its folder's path under `routes/`.

2. **A route answers at its own `/`.** `routes/version/index.ts` registers `GET /`, and
   `ROUTES` mounts it at `/version`. A route never repeats its own path.

3. **A deeper path is a folder inside it.** `/version/history` would be
   `routes/version/history/index.ts`, mounted by its parent:

   ```ts
   export function createVersionRoutes(): Hono {
   	return new Hono()
   		.get("/", ...)
   		.route("/history", createVersionHistoryRoutes());
   }
   ```

4. **A grouping folder has no `index.ts`.** A folder that only collects routes, such as
   `routes/admin/` holding `routes/admin/users/`, serves nothing itself; each route inside
   it is its own line in `ROUTES`, at its full path (`/admin/users`).

5. **A new route is a folder plus one line in `ROUTES`**, in [`index.ts`](./index.ts):

   ```ts
   const ROUTES = [
   	{ path: "/version", create: createVersionRoutes },
   	{ path: "/orders", create: createOrderRoutes },
   ];
   ```

6. **A route reads the request, calls one use case and picks the response.** Validation of
   the input, the status code and the response shape belong to the route; everything the
   API knows or does belongs to the use case in `@/use-cases/cases/`. A route never reaches
   the config, the logger or a client itself.

   ```ts
   // good
   .get("/", async (context) => context.json(await loadVersionUseCase()))

   // bad — the route reads the config the use case owns
   .get("/", (context) => context.json({ commit: getConfig().commit }))
   ```

## Tests

A route's tests sit in its `__tests__/` and call `buildHttp()` with the real URL, so they
also check where `ROUTES` mounts it. The use case is replaced by the mock in the route's
`__mocks__/`, as `routes/version/__tests__/index.test.ts` does.

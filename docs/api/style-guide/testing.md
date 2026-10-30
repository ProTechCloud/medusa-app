# API Testing

Testing rules for `apps/backend`. Where tests, mocks and factories live, and what a good test
asserts, are in [Test Organization](../../style-guide/test-organization.md) and
[Test Quality](../../style-guide/test-quality.md); this page adds what is specific to routes
and use cases.

Paths below are under `apps/backend/src/`.

## Runner

Vitest, in a Node environment: `apps/backend/vitest.config.ts` sets `environment: "node"`,
the `@/` alias, and `LOG_LEVEL=silent` so the process logger writes nothing. The API runs on
Bun, but its tests run on Node, like every other workspace. `yarn test` from the root runs
them.

## Route tests

A route test calls `buildHttp()` with the real URL, so it also proves where `ROUTES` mounts
the route. It replaces the use-case module, never the use case's dependencies: the route
does not know them, so its test does not either.

The mock is a file, `__mocks__/mock-<name>-use-case.ts`, beside the route. From
`services/api/http/routes/version/__tests__/index.test.ts`:

```ts
vi.mock(
	"@/use-cases/cases/load-version.use-case",
	() =>
		import(
			"@/services/api/http/routes/version/__mocks__/mock-load-version-use-case"
		),
);

it("answers with the build that is running", async () => {
	const version = generateVersion();
	vi.mocked(loadVersionUseCase).mockResolvedValue(version);

	const response = await buildHttp().request("/version");

	expect(response.status).toBe(200);
});
```

`placement` in `@medusa/eslint-plugin` reports an import of a `__mocks__/` file from outside
the folder that owns it, so a route's mock stays with that route's tests.

## Use-case tests

A use-case test registers a context with `setCtxForTests`, through
`useCaseContextForEachTest` in `testing/use-case-context.ts`, and calls the use case as a
route would. It overrides only the fields the test is about, as
`use-cases/cases/__tests__/load-version.use-case.test.ts` does with the config. To assert on
what a use case logged, pass a logger from `createCapturingLogger` in
`testing/test-logger.ts`; do not spy on pino.

## Mocks default to failure

A mock rejects until the test sets a result. `mock-load-version-use-case.ts` is a `vi.fn`
created with an implementation that throws, so a test that forgot `mockResolvedValue` fails,
instead of passing on `undefined`. `mockReset: true` in `apps/backend/vitest.config.ts` brings
that implementation back before every test, so one test's result never leaks into the next.

## Faker for data

Data comes from `generate-*.ts` factories that use faker and take overrides:
`shared/__mocks__/generate-config.ts` for the config, `generate-version.ts` beside the version
route. A literal belongs only in a parser or validator test whose exact payload is under
test, as in `shared/__tests__/env.test.ts`.

## What to assert

- The happy path answers the shape the route promises, with its status.
- An expected failure answers its status and its stable `error` code.
- A dependency that fails propagates: the use case rejects with the same error, as
  `use-cases/__tests__/define-use-case.test.ts` shows. The JSON 500 comes from
  `requestErrors`, which `buildApp()` installs and `buildHttp()` does not, so a route test
  that asserts it adds `.onError(requestErrors)` to the app it builds, as
  `services/api/http/lib/__tests__/request-errors.test.ts` does.

## Keep HTTP-level tests few

Most behaviour is tested on the use case, which is fast and needs no HTTP. A route gets one
test per answer it can give. Tests of the whole app, through `buildApp()` in
`services/api/__tests__/index.test.ts`, cover only what the entry point adds: `/health` and
the 404.

## Anti-patterns

| Anti-pattern                                                  | Prefer                                                   |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| Asserting on route internals: which helper ran, in what order | The status and body the caller sees                      |
| A snapshot of the whole response in every test                | The fields the scenario is about                         |
| An inline `vi.fn()` or mock object in the test file           | A `mock-*.ts` file in `__mocks__/`, imported by the test |
| Mocking a use case's dependencies in a route test             | Mocking the use-case module                              |

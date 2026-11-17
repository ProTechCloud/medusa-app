# Code generation

Each side generates only what it needs from the same schema files, so server code never
reaches a client and client code never reaches the server.

| Side    | Config                                                       | Generates                                                                                                                         |
| ------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Clients | [`packages/gql/codegen.yml`](../../packages/gql/codegen.yml) | `packages/gql/src/__generated__/graphql.ts`: a type for every operation, and a typed document a client sends as it is             |
| The API | [`apps/backend/codegen.yml`](../../apps/backend/codegen.yml) | `apps/backend/src/__generated__/resolvers-types.ts`, a type for every resolver, and `validation.ts`, a zod schema for every input |

Both `__generated__` folders are gitignored: the files are always rebuilt from the schema,
never edited or committed.

## When it runs

- `yarn codegen` runs the `codegen` turbo task in every workspace that has the script. Run it
  after changing a `.graphql` file.
- `typecheck`, `lint`, `test` and `test:coverage` depend on `codegen` in `turbo.json`, so they
  regenerate first; a fresh checkout needs nothing else.
- The image builds them in its `codegen` stage, from the schema alone
  ([README](../../README.md#container)).

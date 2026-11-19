# GraphQL

The API serves one GraphQL endpoint, `POST /graphql` (and `GET` for queries), with
[GraphQL Yoga](https://the-guild.dev/graphql/yoga-server). The schema and the operations
clients send live in [`packages/gql`](../../packages/gql); the API implements them in
[`apps/backend/src/services/api/graphql`](../../apps/backend/src/services/api/graphql).

A local API (`APP_ENV=local`) also serves GraphiQL at `http://localhost:8080/graphql` in a
browser, and answers introspection. A deployed one does neither: clients build from the
schema files in `packages/gql`, not from the running API.

Every API, local or not, refuses an operation that asks for more than 10 top-level fields,
aliases and the fields inside fragments included: each runs a resolver, and a rate-limited
one writes a row. A request body past 100 KB is answered 413 before it is parsed.

## Documents

- [Schema](./schema.md) — where types and operations live, and how to add them
- [Code generation](./codegen.md) — what each side generates, and when it runs

What each operation does, and the errors it answers with, is in [Auth](../auth.md).

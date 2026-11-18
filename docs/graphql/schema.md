# Schema

## Where it lives

```
packages/gql/
├── schema/
│   ├── base.graphql        the empty Query and Mutation roots
│   └── auth.graphql        one file per area, each extending the roots
├── operations/
│   ├── queries/            one operation per file, named after it: Me.graphql
│   └── mutations/          SignUp.graphql, SignIn.graphql, …
└── src/index.ts            `typeDefs`: every schema file, merged
```

The API builds its schema from `typeDefs`. Clients send the operations in `operations/`, as
the typed documents `@medusa/gql/operations` exports, such as `SignInDocument`.

## Rules

1. **One file per area.** An area extends `Query` and `Mutation` with `extend type`; only
   `base.graphql` declares them.
2. **A mutation takes one `input`.** `signUp(input: SignUpInput!)`, never loose arguments, so
   a field can be added without breaking a client.
3. **Describe what a client cannot guess.** A field's description says what it needs and what
   it ends, such as `changePassword` ending every session.
4. **The schema says the shape; the resolver says the rules.** The generated zod schema only
   knows a field is a string. The area's `index.ts` extends it with what the schema
   cannot say, such as an email lowercased or a code of 6 digits, and caps every text a client
   sends: an email at 254 characters, a password at Better Auth's 128. `parseInput` parses the
   input before the use case is called, and a bad one answers `BAD_USER_INPUT` naming each
   field; a ZodError from anywhere else is masked as internal.
5. **A resolver calls one use case.** It parses the input, passes the request's headers and
   returns what the use case returns. Anything else belongs in the use case.

## Adding an operation

1. Add the field to the area's file in `packages/gql/schema/`, with its input type.
2. Add the client's operation to `packages/gql/operations/`.
3. Run `yarn codegen`, then add the resolver in the area's `index.ts` and the use case it
   calls.

A new area is a schema file, a folder under `services/api/graphql/` with its `index.ts`,
and its resolvers merged in `services/api/graphql/index.ts`.

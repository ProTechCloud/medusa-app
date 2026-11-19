# Package Conventions

How code moves out of an app and into `packages/`. [Monorepo](../monorepo.md) covers how to
create a package.

## When to extract

1. **`src/shared/` is shared inside one app, and it is the default.** Code that several
   modules of the same app use lives there.

2. **`packages/` is for code two or more apps use, and only once they do.** Do not promote
   code because it _could_ be reused. Promote it when a second app imports it. Two
   exceptions:
   - **Repository tooling.** `@medusa/eslint-plugin` is a package because the root ESLint
     config loads it for every workspace, not because an app imports it.
   - **The backend's foundations.** `@medusa/db` (the schema, the client and the
     migrations), `@medusa/events` (the event catalog and the bus), `@medusa/emails` (the
     templates), `@medusa/gql` (the GraphQL schema and the clients' operations) and
     `@medusa/seed` (the local users) were planned as packages when sign-in was built, though
     only the backend and `@medusa/seed` import them. Each is a contract more than one
     workspace meets: the seed signs up through `@medusa/db`'s tables, `@medusa/emails`
     renders `@medusa/events`' catalog, and a client builds from `@medusa/gql`.
     `@medusa/seed` is a job, run with `yarn seed`, kept beside `@medusa/db` because it only
     fills that database locally. Anything else the backend alone uses still starts in `apps/backend/src/`.

## Exports

3. **A package exports TypeScript source through a flat root entry.** Consumers import from
   the package name; a subpath exists only where a consumer needs a slice of the package
   without the rest.

   ```json
   {
   	"name": "@medusa/example",
   	"exports": {
   		".": "./src/index.ts"
   	}
   }
   ```

   ```ts
   import { formatMoney } from "@medusa/example";
   ```

4. **Test data for a shape a package owns is exported from a `testing` subpath.** Only tests
   and `__mocks__/` import it; production code never does, so faker and the factories stay
   out of the runtime.

   ```json
   {
   	"exports": {
   		".": "./src/index.ts",
   		"./testing": "./src/testing/index.ts"
   	}
   }
   ```

   ```ts
   // apps/backend/src/users/__mocks__/generate-user.ts
   import { generateUser } from "@medusa/example/testing";
   ```

5. **No build step.** Packages export `.ts` source, not compiled output. Whatever consumes the
   package runs it directly — Bun for the API, Node for tooling such as ESLint — and `tsc`
   type-checks it in place, so there is no `dist/` to rebuild or keep in sync.

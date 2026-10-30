# Import Conventions

## Alias

Inside an app or package, `@/` resolves to `src/`. Each workspace that uses it sets it in its
own `tsconfig.json`, as `apps/backend/tsconfig.json` does:

```json
{
	"compilerOptions": {
		"paths": {
			"@/*": ["./src/*"]
		}
	}
}
```

The test runner needs the same alias: `resolve.alias` in the workspace's `vitest.config.ts`,
or `moduleNameMapper` in `apps/native/jest.config.js`.

## Rules

1. **Use `@/` for anything outside the current folder.**

   ```ts
   // good
   import { config } from "@/config";

   // bad — a path from the workspace root
   import { config } from "src/config";
   ```

2. **Use `./` only for siblings**, files in the same folder. A module's own `lib/` and child
   modules are inside its folder, so its `index.ts` reaches them with `./` too:
   `./lib/to-row`.

   ```ts
   // good — users/lib/to-row.ts importing users/lib/format-email.ts
   import { formatEmail } from "./format-email";

   // bad — a sibling reached through the alias hides that it is local
   import { formatEmail } from "@/users/lib/format-email";
   ```

3. **Inside `src/`, never `../`.** If you need `../` there, use `@/` instead. Files outside
   `src/` that have no alias, such as `packages/eslint-plugin/tests/`, import `../src/`.

   ```ts
   // good
   import { createApp } from "@/app";

   // bad
   import { createApp } from "../../app";
   ```

4. **Packages are imported by bare name, with a subpath only when the package exposes one.**
   A package's `exports` in its `package.json` lists what exists.

   ```ts
   // good — the root entry
   import medusaPlugin from "@medusa/eslint-plugin";

   // bad — invents a subpath the package does not export
   import placement from "@medusa/eslint-plugin/rules/placement";
   ```

## What enforces it

`no-relative-parent-imports` in `@medusa/eslint-plugin` reports every `../` import in
`apps/*/src/**`, with the message `Use @/ instead of relative parent import '<source>'.`
TypeScript reports a subpath a package does not export.

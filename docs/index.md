# Docs

How the Medusa workspace is put together. The [README](../README.md) covers getting started,
the commands, CI/CD and the deploy.

| Page                                                | What it covers                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Monorepo](monorepo.md)                             | The layout, apps vs packages, source-first exports, and how to add an app or a package |
| [Style Guide](style-guide/index.md)                 | Placement, imports, packages, third-party integrations, and how tests are written      |
| [API Style Guide](api/style-guide/index.md)         | Routes and use cases, testing the API, and the production rules for `apps/backend`     |
| [Expo Style Guide](expo/style-guide/index.md)       | Structure, components, hooks, context, state and testing for `apps/native`             |
| [i18n](style-guide/i18n.md)                         | Where the app's strings live, one file per domain, and tests that assert on keys       |
| [TypeScript Conventions](typescript/conventions.md) | Type prefixes, no single-letter names, dates and times with Luxon                      |
| [Environment](environment.md)                       | The three environments, where each reads its values, and every variable                |
| [Dependencies](dependencies.md)                     | Why each `resolutions` override exists and when it can go                              |

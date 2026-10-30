import { Hono } from "hono";
import { createVersionRoutes } from "./routes/version";

/**
 * Every route, keyed by the path its folder spells under `routes/`. Adding a
 * route is a folder and one line here; see the README beside this file.
 */
const ROUTES: ReadonlyArray<{ path: string; create: () => Hono }> = [
	{ path: "/version", create: createVersionRoutes },
];

/** The API's routes, mounted at their paths. */
export function buildHttp(): Hono {
	const app = new Hono();
	for (const route of ROUTES) app.route(route.path, route.create());
	return app;
}

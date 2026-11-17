import type { Hono } from "hono";
import type { TConfig } from "@/config";
import { buildServiceApp } from "@/shared/http/service-app";
import { serveService } from "@/shared/serve-service";
import { buildYoga, GRAPHQL_PATH } from "./graphql";
import { buildHttp } from "./http";
import { requestIdentity } from "./http/lib/request-identity";

/**
 * The whole HTTP app: the shell every service shares, with the app's PostHog
 * identity, then the routes and GraphQL. Given a local config, GraphQL also
 * serves GraphiQL and answers introspection; a test passes none.
 */
export function buildApp(config?: Pick<TConfig, "environment">): Hono {
	return buildServiceApp((app) => {
		app.route("/", buildHttp());

		// GraphQL answers its own errors, with a code a client reads; the 404
		// and 500 are for the rest of the API.
		const yoga = buildYoga({ local: config?.environment === "local" });
		app.on(["GET", "POST"], GRAPHQL_PATH, (context) =>
			yoga.fetch(context.req.raw),
		);
	}, requestIdentity);
}

// Serve only when run, not when a test imports `buildApp`.
if (import.meta.main) await serveService(buildApp);

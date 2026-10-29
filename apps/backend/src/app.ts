import { Hono } from "hono";
import { logger } from "hono/logger";

/** Build-time metadata, injected by the Dockerfile at image build. */
export const meta = {
	service: "medusa-backend",
	version: process.env.APP_VERSION ?? "dev",
	commit: process.env.APP_COMMIT ?? "local",
	environment: process.env.APP_ENV ?? "development",
};

export const app = new Hono();

app.use("*", logger());

app.get("/", (c) =>
	c.json({
		message: "Hello World",
		...meta,
	}),
);

/**
 * Liveness probe. Kept free of dependencies so it stays truthful even when
 * downstream services are degraded — the tunnel uses it to decide if the
 * origin is reachable at all.
 */
app.get("/health", (c) => c.json({ status: "ok", uptime: process.uptime() }));

app.notFound((c) => c.json({ error: "not_found", path: c.req.path }, 404));

app.onError((err, c) => {
	console.error("unhandled", err);
	return c.json({ error: "internal_error" }, 500);
});

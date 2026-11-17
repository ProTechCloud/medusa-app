import type { Hono } from "hono";
import { buildServiceApp } from "@/shared/http/service-app";
import { serveService } from "@/shared/serve-service";
import { startPruning } from "./lib/prune-schedule";
import { PUSH_EMAILS_PATH, pushEmails } from "./lib/push-emails";

/**
 * The worker: what Pub/Sub pushes to, in the shell every service shares. Its
 * one route sends the emails the API publishes.
 */
export function buildWorker(): Hono {
	return buildServiceApp((app) => {
		app.post(PUSH_EMAILS_PATH, pushEmails);
	});
}

// Serve only when run, not when a test imports `buildWorker`. Locally the
// API holds PORT; on Cloud Run WORKER_PORT is unset.
if (import.meta.main) {
	await serveService(buildWorker, (config) => config.workerPort ?? config.port);
	startPruning();
}

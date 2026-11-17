import { runMigrations } from "@medusa/db/migrate";
import { getConfig, type TConfig } from "@/config";
import { logger } from "@/logger";
import { flushTelemetry, withinFlushTimeout } from "@/shared/flush-telemetry";
import { initUseCaseContext } from "@/use-cases";
import { pruneExpiredUseCase } from "@/use-cases/cases/prune-expired.use-case";
import { createServiceContext } from "@/use-cases/lib/build-use-case-context";

/**
 * Applies the migrations not yet applied to the config's database, then
 * prunes the expired rate limits and codes, only when SHOULD_RUN_MIGRATION
 * is `true`; otherwise it says so and changes nothing, not even connecting.
 */
export async function migrate(config: TConfig): Promise<"applied" | "skipped"> {
	if (!config.shouldRunMigration) {
		logger.info("migrations skipped: SHOULD_RUN_MIGRATION is not true");
		return "skipped";
	}
	await runMigrations(config.db.url);
	logger.info("migrations applied");
	// The schema is current now, so the use cases can run against it.
	await initUseCaseContext(createServiceContext);
	await pruneExpiredUseCase();
	return "applied";
}

// Run once and exit, not when a test imports `migrate`.
if (import.meta.main) {
	let code = 0;
	try {
		await migrate(getConfig());
	} catch (error) {
		// As the API's: a bad environment lists every variable, and a refused
		// database connection is printed whole.
		console.error(
			error instanceof Error && error.message ? error.message : error,
		);
		code = 1;
	}
	await withinFlushTimeout(flushTelemetry());
	process.exit(code);
}

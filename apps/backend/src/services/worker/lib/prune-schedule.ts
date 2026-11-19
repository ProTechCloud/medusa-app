import { pruneExpiredUseCase } from "@/use-cases/cases/prune-expired.use-case";

const PRUNE_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Prunes the ended rate-limit windows and expired codes every `intervalMs`
 * while the worker runs, so neither table grows between deploys, when
 * `migrate` prunes too. A failed prune is already logged by the use case,
 * and the next one tries again. Returns the function that stops it.
 */
export function startPruning(intervalMs = PRUNE_INTERVAL_MS): () => void {
	const timer = setInterval(() => {
		pruneExpiredUseCase().catch(() => {});
	}, intervalMs);
	// The server keeps the process alive; the schedule must not.
	timer.unref();
	return () => clearInterval(timer);
}

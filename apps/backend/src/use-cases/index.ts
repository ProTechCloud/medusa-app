import type { Logger } from "pino";
import type { TConfig } from "@/config";

/**
 * What every use case receives. The transport layer — routes, and later
 * jobs — never holds these: it calls a use case, and the use case reaches the
 * config, the logger and, as they arrive, the clients.
 */
export type TUseCaseContext = {
	config: TConfig;
	logger: Logger;
};

export type TUseCase<TArgs, TResult> = (
	ctx: TUseCaseContext,
	args: TArgs,
) => Promise<TResult>;

// Process-wide, set once at startup by `initUseCaseContext`, or per test by
// `setCtxForTests`.
let ctx: TUseCaseContext | null = null;

function getCtx(): TUseCaseContext {
	if (!ctx) {
		throw new Error(
			"use-cases: no context. The entry point must call `initUseCaseContext()` before serving; tests must call `setCtxForTests()`.",
		);
	}
	return ctx;
}

/** Startup: register the context every use case runs with. */
export function initUseCaseContext(context: TUseCaseContext): void {
	ctx = context;
}

/** Tests only: register a fixture context. */
export function setCtxForTests(context: TUseCaseContext): void {
	ctx = context;
}

/** Tests only: the registered context, or `null`, without throwing. */
export function ctxForTests(): TUseCaseContext | null {
	return ctx;
}

/** Tests only: drop the context, so the next use case call throws until one is set. */
export function resetCtx(): void {
	ctx = null;
}

/**
 * Define a use case. The body takes the context as its first argument; the
 * function returned hides it, so callers write `await loadVersionUseCase()`
 * and the registered context is injected.
 *
 * The body must be a named function: its name is what the log lines around
 * each call carry.
 *
 *   loadVersionUseCase called
 *   loadVersionUseCase ok      durationMs=1
 *
 * A failure is logged with its duration and rethrown unchanged, so the
 * caller decides what it means.
 */
export function defineUseCase<TArgs = void, TResult = unknown>(
	impl: TUseCase<TArgs, TResult>,
): (args: TArgs) => Promise<TResult> {
	const name = impl.name;
	if (!name) {
		throw new Error(
			"defineUseCase needs a named function, so its logs say which use case ran",
		);
	}

	return async (args: TArgs) => {
		const context = getCtx();
		const started = performance.now();
		const elapsed = () => Math.round(performance.now() - started);

		context.logger.info({ useCase: name }, `${name} called`);
		try {
			const result = await impl(context, args);
			context.logger.info(
				{ useCase: name, durationMs: elapsed() },
				`${name} ok`,
			);
			return result;
		} catch (error) {
			context.logger.error(
				{ useCase: name, durationMs: elapsed(), err: error },
				`${name} failed`,
			);
			throw error;
		}
	};
}

import { SpanStatusCode, trace } from "@opentelemetry/api";
import { ATTR_ERROR_TYPE } from "@opentelemetry/semantic-conventions";
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

// From the global provider, which the preload registers before this module
// loads; without PostHog it is a no-op tracer.
const tracer = trace.getTracer("use-cases");

// Process-wide, built once at startup by `initUseCaseContext`, or set per test
// by `setCtxForTests`.
let ctx: TUseCaseContext | null = null;
// The build in flight. Concurrent callers share it instead of starting a
// second one, which would build every client twice and throw one set away.
let building: Promise<TUseCaseContext> | null = null;

async function getCtx(): Promise<TUseCaseContext> {
	if (ctx) return ctx;
	if (building) return building;
	throw new Error(
		"use-cases: no context. The entry point must await `initUseCaseContext()` before serving; tests must call `setCtxForTests()`.",
	);
}

/**
 * Startup: build the context every use case runs with, now rather than on
 * the first call, so a bad environment or an unreachable client fails the
 * boot. The builder is async because clients are: a database pool, a
 * secret read. The entry point awaits this before it serves.
 *
 * Called again while the build runs, or after it succeeded, it returns the
 * same context and ignores the new builder. A failed build is forgotten, so
 * the next call starts from a clean slate.
 */
export function initUseCaseContext(
	build: () => Promise<TUseCaseContext>,
): Promise<TUseCaseContext> {
	if (ctx) return Promise.resolve(ctx);
	building ??= build()
		.then((context) => {
			ctx = context;
			return context;
		})
		.finally(() => {
			building = null;
		});
	return building;
}

/** Tests only: register a fixture context. */
export function setCtxForTests(context: TUseCaseContext): void {
	ctx = context;
	building = null;
}

/**
 * Tests only: the registered context. Throws when there is none, so a test
 * that forgot to register one fails at this line, not later on a `null`.
 */
export function ctxForTests(): TUseCaseContext {
	if (!ctx) {
		throw new Error(
			"use-cases: no context registered. Call `setCtxForTests()` first.",
		);
	}
	return ctx;
}

/** Tests only: drop the context, so the next use case call throws until one is set. */
export function resetCtx(): void {
	ctx = null;
	building = null;
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
 * Each call is also a span, `use-case <name>`, under the request's. A
 * failure is logged with its duration, marked on the span with its
 * `error.type` and the error status, and rethrown unchanged, so the caller
 * decides what it means.
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
		const context = await getCtx();
		return tracer.startActiveSpan(`use-case ${name}`, async (span) => {
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
				span.setAttribute(
					ATTR_ERROR_TYPE,
					error instanceof Error ? error.name : typeof error,
				);
				span.setStatus({ code: SpanStatusCode.ERROR });
				throw error;
			} finally {
				span.end();
			}
		});
	};
}

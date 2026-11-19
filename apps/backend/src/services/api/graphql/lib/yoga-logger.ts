import type { Logger as THiveLogger } from "graphql-yoga";
import type { Logger } from "pino";

type TLevel = "trace" | "debug" | "info" | "warn" | "error";

/**
 * The methods Yoga calls on its logger: each level takes a message, or
 * attributes and then a message; `log` takes the level first; `child` names
 * a part of Yoga.
 */
type TYogaLogger = Record<TLevel, (...args: unknown[]) => void> & {
	log: (level: TLevel, ...args: unknown[]) => void;
	flush: () => undefined;
	child: (prefixOrAttrs: string | Record<string, unknown>) => TYogaLogger;
};

/**
 * Yoga's logs, written by the API's pino logger. Given `true`, `false` or a
 * level, Yoga builds its own logger, which reads LOG_LEVEL and throws at a
 * value it does not know, such as the `silent` and `fatal` pino accepts.
 * Given an object, it uses it as it is; `buildYoga` passes this one.
 */
export function yogaLogger(logger: Logger): TYogaLogger {
	// Yoga calls each with a message, or with attributes and then a message.
	const forward =
		(level: TLevel) =>
		(...args: unknown[]) => {
			const [first, ...rest] = args;
			const [attrs, message] =
				typeof first === "string" ? [{}, first] : [first ?? {}, rest.shift()];
			logger[level](attrs as object, message as string | undefined);
		};
	// Each logging method is checked against Yoga's own logger's, so one that
	// takes or returns what Yoga's does not fails the typecheck. `child`
	// returns this adapter, not that class (graphql/index.ts says why).
	return {
		trace: forward("trace"),
		debug: forward("debug"),
		info: forward("info"),
		warn: forward("warn"),
		error: forward("error"),
		log: (level: TLevel, ...args: unknown[]) => forward(level)(...args),
		// pino writes as it goes, so there is nothing left to flush.
		flush: () => undefined,
		child: (prefixOrAttrs: string | Record<string, unknown>) =>
			yogaLogger(
				logger.child(
					typeof prefixOrAttrs === "string"
						? { component: prefixOrAttrs }
						: prefixOrAttrs,
				),
			),
	} satisfies Pick<
		THiveLogger,
		"trace" | "debug" | "info" | "warn" | "error" | "log" | "flush"
	> &
		Pick<TYogaLogger, "child">;
}

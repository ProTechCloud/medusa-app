import type { createYoga } from "graphql-yoga";
import type { Logger } from "pino";

type TYogaLogging = NonNullable<Parameters<typeof createYoga>[0]["logging"]>;

/**
 * Yoga's logs, written by the API's pino logger. Given `true`, `false` or a
 * level, Yoga builds its own logger, which reads LOG_LEVEL and throws at a
 * value it does not know, such as the `silent` and `fatal` pino accepts.
 * Given an object, it uses it as it is: these are the methods it calls.
 */
export function yogaLogger(logger: Logger): TYogaLogging {
	// Yoga calls each with a message, or with attributes and then a message.
	const forward =
		(level: "debug" | "info" | "warn" | "error") =>
		(...args: unknown[]) => {
			const [first, ...rest] = args;
			const [attrs, message] =
				typeof first === "string" ? [{}, first] : [first ?? {}, rest.shift()];
			logger[level](attrs as object, message as string | undefined);
		};
	return {
		debug: forward("debug"),
		info: forward("info"),
		warn: forward("warn"),
		error: forward("error"),
		child: (prefixOrAttrs: string | Record<string, unknown>) =>
			yogaLogger(
				logger.child(
					typeof prefixOrAttrs === "string"
						? { component: prefixOrAttrs }
						: prefixOrAttrs,
				),
			),
		// Yoga types `logging` as @graphql-hive/logger's `Logger` class, whose
		// `#private` field no object literal can have, so `satisfies` cannot
		// check this. These are the only methods Yoga calls.
	} as unknown as TYogaLogging;
}

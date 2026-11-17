import type { Logger } from "pino";

type TLevel = "debug" | "info" | "warn" | "error";

/**
 * The methods Yoga calls on its logger: each level takes a message, or
 * attributes and then a message; `child` names a part of Yoga.
 */
type TYogaLogger = Record<TLevel, (...args: unknown[]) => void> & {
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
	};
}

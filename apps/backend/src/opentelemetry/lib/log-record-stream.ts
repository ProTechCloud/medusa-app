import {
	type AnyValueMap,
	logs,
	SeverityNumber,
} from "@opentelemetry/api-logs";

const SEVERITY: Record<string, SeverityNumber> = {
	trace: SeverityNumber.TRACE,
	debug: SeverityNumber.DEBUG,
	info: SeverityNumber.INFO,
	warn: SeverityNumber.WARN,
	error: SeverityNumber.ERROR,
	fatal: SeverityNumber.FATAL,
};

/**
 * A pino destination that hands each line to the OpenTelemetry logs SDK,
 * which batches them to PostHog. The line's `msg` is the body, its `level`
 * the severity, its `time` the timestamp, and every other field an
 * attribute. It is written inside the request's context, so the SDK ties the
 * record to the span that was recording.
 *
 * The logger is looked up on each line, so the stream works whether it is
 * built before or after the SDK registers its provider.
 */
export function createLogRecordStream(loggerName: string): {
	write: (line: string) => void;
} {
	return {
		write(line) {
			let record: Record<string, unknown>;
			try {
				record = JSON.parse(line);
			} catch {
				return;
			}
			const { time, level, msg, ...attributes } = record;
			const severityText = typeof level === "string" ? level : undefined;
			logs.getLogger(loggerName).emit({
				timestamp: typeof time === "string" ? new Date(time) : undefined,
				severityNumber: severityText ? SEVERITY[severityText] : undefined,
				severityText,
				body: typeof msg === "string" ? msg : "",
				attributes: attributes as AnyValueMap,
			});
		},
	};
}

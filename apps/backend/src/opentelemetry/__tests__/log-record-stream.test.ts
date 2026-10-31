import { faker } from "@faker-js/faker";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import {
	InMemoryLogRecordExporter,
	LoggerProvider,
	SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createLogRecordStream } from "@/opentelemetry/lib/log-record-stream";

const exporter = new InMemoryLogRecordExporter();

describe("createLogRecordStream", () => {
	beforeAll(() => {
		logs.setGlobalLoggerProvider(
			new LoggerProvider({
				processors: [new SimpleLogRecordProcessor({ exporter })],
			}),
		);
	});

	afterAll(() => {
		logs.disable();
	});

	beforeEach(() => {
		exporter.reset();
	});

	it.each([
		{ level: "debug", severity: SeverityNumber.DEBUG },
		{ level: "info", severity: SeverityNumber.INFO },
		{ level: "warn", severity: SeverityNumber.WARN },
		{ level: "error", severity: SeverityNumber.ERROR },
		{ level: "fatal", severity: SeverityNumber.FATAL },
	])(
		"hands a $level line to the logs SDK with its message, severity, time and fields",
		({ level, severity }) => {
			const time = faker.date.recent();
			const msg = faker.lorem.sentence();
			const path = `/${faker.lorem.slug()}`;
			const status = faker.internet.httpStatusCode();

			createLogRecordStream(faker.lorem.word()).write(
				`${JSON.stringify({ time: time.toISOString(), level, msg, path, status })}\n`,
			);

			const [record] = exporter.getFinishedLogRecords();
			expect(record?.body).toBe(msg);
			expect(record?.severityNumber).toBe(severity);
			expect(record?.severityText).toBe(level);
			expect(record?.attributes).toEqual({ path, status });
			expect(record?.hrTime[0]).toBe(Math.floor(time.getTime() / 1000));
		},
	);

	it("drops a line that is not JSON instead of failing the log call", () => {
		const stream = createLogRecordStream(faker.lorem.word());

		expect(() => stream.write(faker.lorem.sentence())).not.toThrow();
		expect(exporter.getFinishedLogRecords()).toEqual([]);
	});
});

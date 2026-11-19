import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { yogaLogger } from "@/services/api/graphql/lib/yoga-logger";
import { createCapturingLogger } from "@/testing/test-logger";

describe("yogaLogger", () => {
	it("writes a message alone, or after its attributes, as one line", () => {
		const capture = createCapturingLogger();
		const logging = yogaLogger(capture.logger);
		const first = faker.lorem.sentence();
		const second = faker.lorem.sentence();
		const operation = faker.lorem.word();

		logging.info(first);
		logging.info({ operation }, second);

		expect(capture.lines()).toEqual([
			expect.objectContaining({ msg: first }),
			expect.objectContaining({ msg: second, operation }),
		]);
	});

	it.each([
		["trace", 10],
		["debug", 20],
		["info", 30],
		["warn", 40],
		["error", 50],
	] as const)("writes %s at pino's %s", (method, level) => {
		const capture = createCapturingLogger();
		const message = faker.lorem.sentence();

		yogaLogger(capture.logger)[method](message);

		expect(capture.lines()).toEqual([
			expect.objectContaining({ level, msg: message }),
		]);
	});

	it("writes a log call at the level it names", () => {
		const capture = createCapturingLogger();
		const message = faker.lorem.sentence();

		yogaLogger(capture.logger).log("warn", message);

		expect(capture.lines()).toEqual([
			expect.objectContaining({ level: 40, msg: message }),
		]);
	});

	it("has nothing to flush, as pino writes as it goes", () => {
		const capture = createCapturingLogger();

		expect(yogaLogger(capture.logger).flush()).toBeUndefined();
		expect(capture.lines()).toEqual([]);
	});

	it("names a child's lines by its prefix", () => {
		const capture = createCapturingLogger();
		const prefix = faker.lorem.word();
		const message = faker.lorem.sentence();

		yogaLogger(capture.logger).child(prefix).info(message);

		expect(capture.lines()).toEqual([
			expect.objectContaining({ component: prefix, msg: message }),
		]);
	});
});

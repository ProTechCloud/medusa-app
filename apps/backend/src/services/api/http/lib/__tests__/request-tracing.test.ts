import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { redactQuery } from "@/services/api/http/lib/request-tracing";

describe("redactQuery", () => {
	it("replaces every query value with REDACTED and keeps the names", () => {
		const path = `/${faker.lorem.slug()}`;
		const url = `https://${faker.internet.domainName()}${path}?token=${faker.string.alphanumeric(32)}&email=${encodeURIComponent(faker.internet.email())}&token=${faker.string.alphanumeric(8)}`;

		const redacted = redactQuery(url);

		expect(new URL(redacted).pathname).toBe(path);
		expect(new URL(redacted).search).toBe(
			"?token=REDACTED&email=REDACTED&token=REDACTED",
		);
	});

	it("leaves a URL without a query as it is", () => {
		const url = `https://${faker.internet.domainName()}/${faker.lorem.slug()}`;

		expect(redactQuery(url)).toBe(url);
	});
});

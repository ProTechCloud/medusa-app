import { faker } from "@faker-js/faker";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { requestIdentityLogFields } from "@/posthog";
import {
	readRequestIdentity,
	requestIdentity,
} from "@/services/api/http/lib/request-identity";

// A UUIDv7, as PostHog's session IDs are: version 7 and the RFC 4122 variant.
function generateSessionId(): string {
	const hex = faker.string.hexadecimal({
		length: 32,
		prefix: "",
		casing: "lower",
	});
	const variant = faker.helpers.arrayElement(["8", "9", "a", "b"]);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20)}`;
}

function headersOf(values: Record<string, string>) {
	return (name: string) => values[name];
}

describe("readRequestIdentity", () => {
	it("reads the app's distinct ID and session ID", () => {
		const distinctId = faker.string.uuid();
		const sessionId = generateSessionId();

		const identity = readRequestIdentity(
			headersOf({
				"X-POSTHOG-DISTINCT-ID": distinctId,
				"X-POSTHOG-SESSION-ID": sessionId,
			}),
		);

		expect(identity).toEqual({ distinctId, sessionId });
	});

	it("is empty when the app sent neither", () => {
		expect(readRequestIdentity(headersOf({}))).toEqual({});
	});

	it.each([
		{
			label: "longer than 200 characters",
			value: faker.string.alphanumeric(201),
		},
		{
			label: "with a control character",
			value: `${faker.lorem.word()}\n${faker.lorem.word()}`,
		},
	])("drops a distinct ID $label", ({ value }) => {
		expect(
			readRequestIdentity(headersOf({ "X-POSTHOG-DISTINCT-ID": value })),
		).toEqual({});
	});

	it.each([
		{ label: "a UUIDv4", value: faker.string.uuid() },
		{ label: "not a UUID", value: faker.lorem.slug() },
	])("drops a session ID that is $label", ({ value }) => {
		expect(
			readRequestIdentity(headersOf({ "X-POSTHOG-SESSION-ID": value })),
		).toEqual({});
	});
});

describe("requestIdentity", () => {
	it("runs the request as the app's user and session, so its log lines carry them", async () => {
		const distinctId = faker.string.uuid();
		const sessionId = generateSessionId();
		const app = new Hono()
			.use("*", requestIdentity)
			.get("/", (context) => context.json(requestIdentityLogFields()));

		const response = await app.request("/", {
			headers: {
				"X-POSTHOG-DISTINCT-ID": distinctId,
				"X-POSTHOG-SESSION-ID": sessionId,
			},
		});

		expect(await response.json()).toEqual({
			posthogDistinctId: distinctId,
			posthogSessionId: sessionId,
		});
	});
});

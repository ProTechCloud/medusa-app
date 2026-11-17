import { faker } from "@faker-js/faker";
import { generateCodeRequest } from "../__mocks__/generate-code-request";
import type { TEventType } from "../lib/catalog";
import { createEnvelope, parseEnvelope } from "../lib/envelope";

const TYPES: TEventType[] = [
	"signup.code_requested",
	"password.reset_requested",
];

describe("envelope", () => {
	it.each(TYPES)("reads back a %s envelope it wrote", (type) => {
		const data = generateCodeRequest();

		const envelope = createEnvelope(type, data);

		expect(parseEnvelope(JSON.parse(JSON.stringify(envelope)))).toEqual({
			id: envelope.id,
			type,
			occurredAt: envelope.occurredAt,
			data,
		});
	});

	it.each([
		["a code that is not six digits", { code: faker.string.numeric(5) }],
		["an address that is not one", { email: faker.lorem.word() }],
	])("refuses to publish %s", (_, override) => {
		const data = generateCodeRequest(override);

		expect(() => createEnvelope("signup.code_requested", data)).toThrow();
	});

	it.each([
		["an unknown type", { type: faker.lorem.slug() }],
		[
			"data that does not match its type",
			{ data: { code: faker.lorem.word() } },
		],
		["no id", { id: undefined }],
	])("refuses a received message with %s", (_, override) => {
		const message = {
			...createEnvelope("signup.code_requested", generateCodeRequest()),
			...override,
		};

		expect(() => parseEnvelope(message)).toThrow();
	});
});

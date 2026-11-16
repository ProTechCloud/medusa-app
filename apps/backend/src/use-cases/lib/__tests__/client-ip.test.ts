import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { clientIp } from "@/use-cases/lib/client-ip";

const client = faker.internet.ip();
const forged = faker.internet.ip();
const proxy = faker.internet.ip();
const secondProxy = faker.internet.ip();

describe("clientIp", () => {
	it.each([
		["behind one proxy", `${client}, ${proxy}`, 1, client],
		["after a forged entry", `${forged}, ${client}, ${proxy}`, 1, client],
		["behind two proxies", `${client}, ${proxy}, ${secondProxy}`, 2, client],
		["with no proxy trusted", `${forged}, ${client}`, 0, client],
		["shorter than the proxies", client, 1, null],
	])("reads the client %s", (_, header, trustedProxies, expected) => {
		const headers = new Headers({ "x-forwarded-for": header });

		expect(clientIp(headers, trustedProxies)).toBe(expected);
	});

	it("has none without the header", () => {
		expect(clientIp(new Headers(), 1)).toBeNull();
	});
});

import { faker } from "@faker-js/faker";
import { rateLimit } from "@medusa/db";
import { describe, expect, it } from "vitest";
import { generateSignUp } from "@/shared/__mocks__/generate-sign-up";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { limitRequest } from "@/use-cases/lib/rate-limit";

const FIFTEEN_MINUTES_S = 15 * 60;

/** Headers as Cloud Run's load balancer forwards them for `ip`. */
function fromIp(ip: string): Headers {
	return new Headers({
		"x-forwarded-for": `${ip}, ${faker.internet.ip()}`,
	});
}

describe("limitRequest", () => {
	const { ctx } = integrationContextForEachTest({ trustedProxies: 1 });

	it("refuses the eleventh request from one address in 15 minutes, with a retry time", async () => {
		const { email } = generateSignUp();
		for (let request = 1; request <= 10; request++) {
			await limitRequest(ctx(), {
				email,
				headers: fromIp(faker.internet.ip()),
			});
		}

		const refused = limitRequest(ctx(), {
			email,
			headers: fromIp(faker.internet.ip()),
		});

		await expect(refused).rejects.toMatchObject({
			name: "TooManyRequestsError",
			retryAfterSeconds: expect.any(Number),
		});
		const { retryAfterSeconds } = await refused.catch((error) => error);
		expect(retryAfterSeconds).toBeGreaterThan(FIFTEEN_MINUTES_S - 5);
		expect(retryAfterSeconds).toBeLessThanOrEqual(FIFTEEN_MINUTES_S);
	});

	it("refuses the fifty-first request from one client address, whatever the email", async () => {
		const ip = faker.internet.ip();
		for (let request = 1; request <= 50; request++) {
			await limitRequest(ctx(), {
				email: generateSignUp().email,
				headers: fromIp(ip),
			});
		}

		await expect(
			limitRequest(ctx(), {
				email: generateSignUp().email,
				headers: fromIp(ip),
			}),
		).rejects.toMatchObject({ name: "TooManyRequestsError" });
		await expect(
			limitRequest(ctx(), {
				email: generateSignUp().email,
				headers: fromIp(faker.internet.ip()),
			}),
		).resolves.toBeUndefined();
	});

	it("opens a new window once the last one is over", async () => {
		const { email } = generateSignUp();
		for (let request = 1; request <= 10; request++) {
			await limitRequest(ctx(), { email, headers: new Headers() });
		}
		await ctx()
			.db.update(rateLimit)
			.set({ lastRequest: Date.now() - FIFTEEN_MINUTES_S * 1000 - 1 });

		await expect(
			limitRequest(ctx(), { email, headers: new Headers() }),
		).resolves.toBeUndefined();
	});
});

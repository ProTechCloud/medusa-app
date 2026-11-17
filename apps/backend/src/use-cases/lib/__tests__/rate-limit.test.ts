import { faker } from "@faker-js/faker";
import { rateLimit, sql } from "@medusa/db";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { generateSignUp } from "@/shared/__mocks__/generate-sign-up";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { limitRequest, RATE_LIMIT_WINDOW } from "@/use-cases/lib/rate-limit";

const WINDOW_S = RATE_LIMIT_WINDOW.as("seconds");

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
		expect(retryAfterSeconds).toBeGreaterThan(WINDOW_S - 5);
		expect(retryAfterSeconds).toBeLessThanOrEqual(WINDOW_S);
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

	it("counts no address for a client already past its limit", async () => {
		const ip = faker.internet.ip();
		for (let request = 1; request <= 50; request++) {
			await limitRequest(ctx(), {
				email: generateSignUp().email,
				headers: fromIp(ip),
			});
		}
		const { email } = generateSignUp();

		await expect(
			limitRequest(ctx(), { email, headers: fromIp(ip) }),
		).rejects.toMatchObject({ name: "TooManyRequestsError" });

		const rows = await ctx()
			.db.select({ key: rateLimit.key })
			.from(rateLimit)
			.where(sql`${rateLimit.key} = ${`address:${email}`}`);
		expect(rows).toEqual([]);
	});

	it("opens a new window once the last one is over", async () => {
		const { email } = generateSignUp();
		for (let request = 1; request <= 10; request++) {
			await limitRequest(ctx(), { email, headers: new Headers() });
		}
		await ctx()
			.db.update(rateLimit)
			.set({
				lastRequest: DateTime.utc()
					.minus(RATE_LIMIT_WINDOW)
					.minus({ milliseconds: 1 })
					.toMillis(),
			});

		await expect(
			limitRequest(ctx(), { email, headers: new Headers() }),
		).resolves.toBeUndefined();
	});
});

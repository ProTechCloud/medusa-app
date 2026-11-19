import { describe, expect, it } from "vitest";
import { integrationContextForEachTest } from "@/testing/integration-context";
import { requestHeaders, signUpTestUser } from "@/testing/test-user";
import { revokeSessions } from "@/use-cases/lib/sessions";

describe("revokeSessions", () => {
	const { ctx, bus } = integrationContextForEachTest();

	it("rejects a session cached again while the revoke ran", async () => {
		const { user, token } = await signUpTestUser(bus());
		const headers = requestHeaders(token);
		const { internalAdapter } = await ctx().auth.$context;

		await revokeSessions(ctx(), user.id, async () => {
			// A request in between: the session is still valid, so it is cached.
			expect(await ctx().sessionCache.get(headers)).not.toBeNull();
			await internalAdapter.deleteUserSessions(user.id);
		});

		expect(await ctx().sessionCache.get(headers)).toBeNull();
	});

	it("returns what the revoke returned", async () => {
		const { user } = await signUpTestUser(bus());

		const result = await revokeSessions(ctx(), user.id, async () => user.id);

		expect(result).toBe(user.id);
	});
});

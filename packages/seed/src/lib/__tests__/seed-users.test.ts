import { describe, expect, it } from "vitest";
import { mockSeedAuth } from "#src/lib/__mocks__/mock-seed-auth.ts";
import { seedUsers } from "#src/lib/seed-users.ts";
import { SEED_USERS } from "#src/lib/users.ts";

describe("seedUsers", () => {
	it("signs every seed user up", async () => {
		const auth = mockSeedAuth();

		await seedUsers(auth, () => {});

		expect(auth.signedUp).toEqual(SEED_USERS.map(({ email }) => email));
	});

	it("leaves the users already there, so it runs again safely", async () => {
		const auth = mockSeedAuth();
		await seedUsers(auth, () => {});
		const lines: string[] = [];

		await seedUsers(auth, (line) => lines.push(line));

		expect(auth.signedUp).toHaveLength(SEED_USERS.length);
		expect(lines).toEqual(
			SEED_USERS.map(({ email }) => `  ${email}: already there`),
		);
	});
});

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { DateTime, Duration } from "luxon";
import { z } from "zod";
import { badInput } from "@/shared/domain-errors";
import type { TUseCaseContext } from "@/use-cases";

const CODE_TTL = Duration.fromObject({ minutes: 15 });
const MAX_ATTEMPTS = 5;
/**
 * Accepted beside the emailed code on a local API only, where no email is
 * usually sent. Never on a deployed one, key or not: there it would let
 * anyone reset anyone's password.
 */
const FIXED_CODE = "111111";

export type TCodeFlow = "sign-up" | "password-reset";

const storedSchema = z.object({ hash: z.string(), attempts: z.number() });

/**
 * The code's HMAC under the auth secret. A plain hash of six digits is
 * reversed by trying the million of them; without the secret it is not.
 */
function hashCode(ctx: TUseCaseContext, code: string): string {
	return createHmac("sha256", ctx.config.auth.secret)
		.update(code)
		.digest("hex");
}

function matches(stored: string, candidate: string): boolean {
	return timingSafeEqual(
		Buffer.from(stored, "hex"),
		Buffer.from(candidate, "hex"),
	);
}

function identifier(flow: TCodeFlow, email: string): string {
	return `${flow}:${email}`;
}

/**
 * A new 6-digit code for `email` in `flow`, which replaces any earlier one.
 * Only its HMAC and an attempt count are stored, in Better Auth's
 * `verification` table; the code is returned for the email.
 */
export async function issueCode(
	ctx: TUseCaseContext,
	flow: TCodeFlow,
	email: string,
): Promise<string> {
	const { internalAdapter } = await ctx.auth.$context;
	const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
	await internalAdapter.deleteVerificationByIdentifier(identifier(flow, email));
	await internalAdapter.createVerificationValue({
		identifier: identifier(flow, email),
		value: JSON.stringify({ hash: hashCode(ctx, code), attempts: 0 }),
		// The adapter stores a Date.
		expiresAt: DateTime.utc().plus(CODE_TTL).toJSDate(),
	});
	return code;
}

/**
 * Checks `code` for `email` in `flow`. A wrong one counts an attempt, and the
 * fifth deletes the code; a missing or expired one is refused the same way,
 * so the answer never says which. On a local API, `111111` is accepted
 * beside the stored code. Returns `burn`, which deletes the code:
 * the caller burns it once what the code allowed has happened.
 */
export async function checkCode(
	ctx: TUseCaseContext,
	flow: TCodeFlow,
	email: string,
	code: string,
): Promise<{ burn: () => Promise<void> }> {
	const { internalAdapter } = await ctx.auth.$context;
	const id = identifier(flow, email);
	const refused = badInput("The code is wrong or has expired.");

	const row = await internalAdapter.findVerificationValue(id);
	if (!row || DateTime.fromJSDate(row.expiresAt) <= DateTime.utc()) {
		if (row) await internalAdapter.deleteVerificationByIdentifier(id);
		throw refused;
	}

	const stored = storedSchema.parse(JSON.parse(row.value));
	const accepted =
		matches(stored.hash, hashCode(ctx, code)) ||
		(ctx.config.environment === "local" && code === FIXED_CODE);

	if (!accepted) {
		const attempts = stored.attempts + 1;
		if (attempts >= MAX_ATTEMPTS) {
			await internalAdapter.deleteVerificationByIdentifier(id);
		} else {
			await internalAdapter.updateVerificationByIdentifier(id, {
				value: JSON.stringify({ ...stored, attempts }),
			});
		}
		throw refused;
	}

	return {
		burn: () => internalAdapter.deleteVerificationByIdentifier(id),
	};
}

import { defineUseCase } from "@/use-cases";
import { issueCode } from "@/use-cases/lib/codes";
import { limitRequest } from "@/use-cases/lib/rate-limit";

/**
 * Emails a sign-up code to an address with no account. For an address that
 * has one it sends nothing, and answers the same, so no answer's content says
 * who has an account; its timing can (docs/auth.md).
 */
export const requestSignUpCodeUseCase = defineUseCase<
	{ email: string; headers: Headers },
	{ sent: true }
>(async function requestSignUpCodeUseCase(ctx, { email, headers }) {
	await limitRequest(ctx, { email, headers });

	const { internalAdapter } = await ctx.auth.$context;
	if (await internalAdapter.findUserByEmail(email)) return { sent: true };

	const code = await issueCode(ctx, "sign-up", email);
	await ctx.bus.publish("signup.code_requested", { email, code });
	return { sent: true };
});

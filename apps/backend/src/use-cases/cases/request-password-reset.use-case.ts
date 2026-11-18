import { defineUseCase } from "@/use-cases";
import { issueCode } from "@/use-cases/lib/codes";
import { limitRequest } from "@/use-cases/lib/rate-limit";

/**
 * Emails a password reset code to an address that has an account. For one
 * that has none it sends nothing, and answers the same, so no answer's
 * content says who has an account; its timing can (docs/auth.md).
 */
export const requestPasswordResetUseCase = defineUseCase<
	{ email: string; headers: Headers },
	{ sent: true }
>(async function requestPasswordResetUseCase(ctx, { email, headers }) {
	await limitRequest(ctx, { email, headers });

	const { internalAdapter } = await ctx.auth.$context;
	if (!(await internalAdapter.findUserByEmail(email))) return { sent: true };

	const code = await issueCode(ctx, "password-reset", email);
	await ctx.bus.publish("password.reset_requested", { email, code });
	return { sent: true };
});

import { badInput } from "@/shared/domain-errors";
import { defineUseCase } from "@/use-cases";
import { checkCode } from "@/use-cases/lib/codes";
import { limitRequest } from "@/use-cases/lib/rate-limit";
import { revokeSessions } from "@/use-cases/lib/sessions";

/**
 * Sets a new password with the emailed code, and ends every session of the
 * account: a reset recovers from a password someone else may know.
 *
 * Better Auth's own reset takes the token of its emailed link, not a code,
 * so this does what it does inside: hash the password its way, store it on
 * the credential account, and delete the sessions.
 */
export const resetPasswordUseCase = defineUseCase<
	{ email: string; code: string; newPassword: string; headers: Headers },
	true
>(async function resetPasswordUseCase(
	ctx,
	{ email, code, newPassword, headers },
) {
	await limitRequest(ctx, { email, headers });
	const { burn } = await checkCode(ctx, "password-reset", email, code);

	const authContext = await ctx.auth.$context;
	const { minPasswordLength, maxPasswordLength } = authContext.password.config;
	if (newPassword.length < minPasswordLength) {
		throw badInput(
			`The password must be at least ${minPasswordLength} characters.`,
		);
	}
	if (newPassword.length > maxPasswordLength) {
		throw badInput("The password is too long.");
	}

	const found = await authContext.internalAdapter.findUserByEmail(email);
	if (!found) throw badInput("The code is wrong or has expired.");

	const hash = await authContext.password.hash(newPassword);
	await authContext.internalAdapter.updatePassword(found.user.id, hash);
	await revokeSessions(ctx, found.user.id, () =>
		authContext.internalAdapter.deleteUserSessions(found.user.id),
	);
	await burn();
	return true;
});

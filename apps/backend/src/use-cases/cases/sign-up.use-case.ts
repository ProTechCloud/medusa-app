import { withAuthErrors } from "@/better-auth";
import { defineUseCase } from "@/use-cases";
import { type TAuthSession, toAuthSession } from "@/use-cases/lib/auth-user";
import { checkCode } from "@/use-cases/lib/codes";
import { limitRequest } from "@/use-cases/lib/rate-limit";

/**
 * Creates the account the emailed code was for, with its address verified,
 * and signs it in. The code is burnt only once the account exists, so a
 * failed sign-up, such as a password that is too short, can be retried with
 * the same code.
 */
export const signUpUseCase = defineUseCase<
	{
		email: string;
		code: string;
		name: string;
		password: string;
		headers: Headers;
	},
	TAuthSession
>(async function signUpUseCase(ctx, { email, code, name, password, headers }) {
	await limitRequest(ctx, { email, headers });
	const { burn } = await checkCode(ctx, "sign-up", email, code);

	const result = await withAuthErrors(() =>
		ctx.auth.api.signUpEmail({ body: { email, name, password } }),
	);
	const { internalAdapter } = await ctx.auth.$context;
	await internalAdapter.updateUser(result.user.id, { emailVerified: true });
	await burn();

	return toAuthSession(result);
});

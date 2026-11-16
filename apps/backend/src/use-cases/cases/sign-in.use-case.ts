import { withAuthErrors } from "@/better-auth/lib/errors";
import { defineUseCase } from "@/use-cases";
import { type TAuthSession, toAuthSession } from "@/use-cases/lib/auth-user";
import { limitRequest } from "@/use-cases/lib/rate-limit";

/** Opens a session for an address and its password. */
export const signInUseCase = defineUseCase<
	{ email: string; password: string; headers: Headers },
	TAuthSession
>(async function signInUseCase(ctx, { email, password, headers }) {
	await limitRequest(ctx, { email, headers });

	const result = await withAuthErrors(() =>
		ctx.auth.api.signInEmail({ body: { email, password } }),
	);
	return toAuthSession(result);
});

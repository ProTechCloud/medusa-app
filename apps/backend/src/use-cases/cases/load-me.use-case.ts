import { defineUseCase } from "@/use-cases";
import { type TAuthUser, toAuthUser } from "@/use-cases/lib/auth-user";

/** The user the request's session belongs to, or null without a session. */
export const loadMeUseCase = defineUseCase<
	{ headers: Headers },
	TAuthUser | null
>(async function loadMeUseCase(ctx, { headers }) {
	const session = await ctx.sessionCache.get(headers);
	return session ? toAuthUser(session.user) : null;
});

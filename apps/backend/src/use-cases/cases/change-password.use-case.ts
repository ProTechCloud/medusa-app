import { withAuthErrors } from "@/better-auth";
import { unauthenticated } from "@/shared/domain-errors";
import { defineUseCase } from "@/use-cases";
import { type TAuthSession, toAuthSession } from "@/use-cases/lib/auth-user";
import { revokeSessions } from "@/use-cases/lib/sessions";

/**
 * Changes the password of the signed-in user. Every session of the account
 * ends, this one too, and a new one opens: its token is returned for the
 * client to keep using.
 */
export const changePasswordUseCase = defineUseCase<
	{ currentPassword: string; newPassword: string; headers: Headers },
	TAuthSession
>(async function changePasswordUseCase(
	ctx,
	{ currentPassword, newPassword, headers },
) {
	const session = await ctx.sessionCache.get(headers);
	if (!session) throw unauthenticated();

	const result = await revokeSessions(ctx, session.user.id, () =>
		withAuthErrors(() =>
			ctx.auth.api.changePassword({
				body: { currentPassword, newPassword, revokeOtherSessions: true },
				headers,
			}),
		),
	);
	return toAuthSession(result);
});

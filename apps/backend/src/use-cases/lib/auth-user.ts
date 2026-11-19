/** The signed-in user, as the use cases return it. */
export type TAuthUser = {
	id: string;
	name: string;
	email: string;
	role: "application_user";
};

/** A new session: its user, and the token the client sends from then on. */
export type TAuthSession = { user: TAuthUser; token: string };

export function toAuthUser(user: {
	id: string;
	name: string;
	email: string;
	role?: unknown;
}): TAuthUser {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: "application_user",
	};
}

/**
 * A Better Auth result as a session. With the bearer plugin every sign-in
 * returns a token; one without is a misconfiguration, not the client's fault.
 */
export function toAuthSession(result: {
	user: Parameters<typeof toAuthUser>[0];
	token: string | null | undefined;
}): TAuthSession {
	if (!result.token) throw new Error("Better Auth returned no session token");
	return { user: toAuthUser(result.user), token: result.token };
}

import { isAPIError } from "better-auth/api";
import { badInput } from "@/use-cases/lib/domain-errors";

/**
 * Better Auth's error codes a client can act on, each with the message it
 * reads. "Wrong email or password" is the same for both, so an answer never
 * says whether an address has an account.
 */
const MESSAGES: Record<string, string> = {
	PASSWORD_TOO_SHORT: "The password must be at least 8 characters.",
	PASSWORD_TOO_LONG: "The password is too long.",
	USER_ALREADY_EXISTS: "An account with this email already exists. Sign in.",
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
		"An account with this email already exists. Sign in.",
	INVALID_EMAIL: "Enter a valid email address.",
	INVALID_EMAIL_OR_PASSWORD: "Wrong email or password.",
	INVALID_PASSWORD: "The current password is wrong.",
	CREDENTIAL_ACCOUNT_NOT_FOUND: "Wrong email or password.",
};

/**
 * Runs a Better Auth call and turns the errors a client can act on into
 * `badInput`; anything else is rethrown as it is, to be logged and masked.
 */
export async function withAuthErrors<TResult>(
	call: () => Promise<TResult>,
): Promise<TResult> {
	try {
		return await call();
	} catch (error) {
		const code = isAPIError(error)
			? (error as { body?: { code?: unknown } }).body?.code
			: undefined;
		const message = typeof code === "string" ? MESSAGES[code] : undefined;
		throw message ? badInput(message) : error;
	}
}

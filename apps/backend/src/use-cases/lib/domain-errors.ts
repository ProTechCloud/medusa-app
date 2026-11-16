/**
 * The errors a use case throws for the caller to act on. The transport maps
 * each by its `name`: the GraphQL error mask turns them into a code and a
 * message the client may read. Anything else is masked as an internal error.
 */
export const DOMAIN_ERROR_NAMES = {
	BAD_INPUT: "BadInputError",
	UNAUTHENTICATED: "UnauthenticatedError",
	TOO_MANY_REQUESTS: "TooManyRequestsError",
} as const;

/** The input cannot be acted on, and the message says why. */
export function badInput(message: string): Error {
	return Object.assign(new Error(message), {
		name: DOMAIN_ERROR_NAMES.BAD_INPUT,
	});
}

/** The request needs a session it does not have. */
export function unauthenticated(message = "Sign in first."): Error {
	return Object.assign(new Error(message), {
		name: DOMAIN_ERROR_NAMES.UNAUTHENTICATED,
	});
}

export type TTooManyRequestsError = Error & { retryAfterSeconds: number };

/** A limit was reached; the caller may try again after `retryAfterSeconds`. */
export function tooManyRequests(
	retryAfterSeconds: number,
): TTooManyRequestsError {
	return Object.assign(
		new Error(`Too many requests. Try again in ${retryAfterSeconds} seconds.`),
		{ name: DOMAIN_ERROR_NAMES.TOO_MANY_REQUESTS, retryAfterSeconds },
	);
}

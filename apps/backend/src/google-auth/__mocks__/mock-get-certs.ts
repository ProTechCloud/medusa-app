import type { generateSigningKey } from "./generate-push-token";

/**
 * Hands `createGooglePushVerifier` the key's certificates, in place of
 * fetching Google's.
 */
export function mockGetCerts(key: ReturnType<typeof generateSigningKey>) {
	return async () => key.certs;
}

/** A `getCerts` that fails, as a fetch of Google's certificates can. */
export function mockFailingGetCerts() {
	return async (): Promise<never> => {
		throw new Error("Google's certificates could not be fetched");
	};
}

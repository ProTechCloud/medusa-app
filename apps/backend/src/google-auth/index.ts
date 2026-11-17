import { OAuth2Client } from "google-auth-library";
import type { Logger } from "pino";

/** Decides whether a push came from the subscription the worker trusts. */
export interface IPushVerifier {
	verify(authorization: string | undefined): Promise<boolean>;
}

// The issuers Google signs its OIDC tokens as.
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

type TCerts = Record<string, string>;

/**
 * Trusts a push that carries a Google-signed OIDC token for `audience`,
 * issued to `serviceAccount` with its email verified: what a push
 * subscription sends when it is set to authenticate. Anything else, a
 * missing or expired token included, is refused.
 *
 * `getCerts` fetches Google's signing certificates, which the client caches;
 * a test passes its own.
 */
export function createGooglePushVerifier({
	audience,
	serviceAccount,
	getCerts,
}: {
	audience: string;
	serviceAccount: string;
	getCerts?: () => Promise<TCerts>;
}): IPushVerifier {
	const client = new OAuth2Client();
	const certs =
		getCerts ??
		(async () => (await client.getFederatedSignonCertsAsync()).certs);
	return {
		async verify(authorization) {
			const token = /^Bearer (.+)$/.exec(authorization ?? "")?.[1];
			if (!token) return false;
			try {
				const ticket = await client.verifySignedJwtWithCertsAsync(
					token,
					await certs(),
					audience,
					GOOGLE_ISSUERS,
				);
				const payload = ticket.getPayload();
				return (
					payload?.email === serviceAccount && payload.email_verified === true
				);
			} catch {
				return false;
			}
		},
	};
}

/**
 * For a local worker, whose emulator pushes with no token: trusts every
 * push.
 */
export function createLocalPushVerifier(): IPushVerifier {
	return { verify: async () => true };
}

/**
 * For a deployed worker without its push variables: refuses every push, and
 * logs why, so the missing configuration shows instead of lost emails.
 */
export function createClosedPushVerifier(logger: Logger): IPushVerifier {
	return {
		async verify() {
			logger.error(
				"push refused: PUBSUB_PUSH_AUDIENCE and PUBSUB_PUSH_SERVICE_ACCOUNT are not set",
			);
			return false;
		},
	};
}

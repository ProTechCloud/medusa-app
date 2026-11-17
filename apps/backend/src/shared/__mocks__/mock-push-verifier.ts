import type { IPushVerifier } from "@/google-auth";

/** A push verifier that answers `trusted` to every push, for tests. */
export function createPushVerifier(trusted: boolean): IPushVerifier {
	return { verify: async () => trusted };
}

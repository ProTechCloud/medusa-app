import type { IPushVerifier } from "@/google-auth";

/** A push verifier that answers `trusted` to every push, for tests. */
export function mockPushVerifier(trusted: boolean): IPushVerifier {
	return { verify: async () => trusted };
}

/** A push verifier that throws `error`, as one does when Google's certificates fail to load. */
export function mockFailingPushVerifier(error: Error): IPushVerifier {
	return {
		verify: async () => {
			throw error;
		},
	};
}

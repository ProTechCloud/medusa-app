import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { type TApiVersion, versionSchema } from "./lib/version-schema";

const API_VERSION_URL = "https://api-stg-medusa.fabianalula.site/version";

// How long a request may wait for its answer. Android's HTTP client has no
// timeout of its own, so a stalled connection would otherwise check forever.
const REQUEST_TIMEOUT_MS = 10_000;

type TApiVersionStatus = "checking" | "ok" | "failed";

type TApiVersionState = {
	status: TApiVersionStatus;
	version: TApiVersion | null;
};

/**
 * What the stg API answers at `/version`, asked again each time the screen
 * comes into focus and whenever `check` is called. A non-2xx answer, a
 * network error, a body that does not parse and no answer within
 * `REQUEST_TIMEOUT_MS` all end as `failed`. Leaving the screen cancels the
 * request in flight and sets nothing.
 */
export function useApiVersion(): TApiVersionState & { check: () => void } {
	const [state, setState] = useState<TApiVersionState>({
		status: "checking",
		version: null,
	});
	// The latest request. Only it may set the state, so a slow answer to an
	// earlier one, or its cancellation, never overwrites a newer result.
	const latest = useRef<AbortController | null>(null);

	const check = useCallback(() => {
		const request = new AbortController();
		latest.current = request;
		setState({ status: "checking", version: null });
		const timeout = setTimeout(() => request.abort(), REQUEST_TIMEOUT_MS);

		void (async () => {
			try {
				const response = await fetch(API_VERSION_URL, {
					signal: request.signal,
				});
				if (!response.ok) throw new Error(`status ${response.status}`);
				const version = versionSchema.parse(await response.json());
				if (request === latest.current) setState({ status: "ok", version });
			} catch {
				if (request === latest.current) {
					setState({ status: "failed", version: null });
				}
			} finally {
				clearTimeout(timeout);
			}
		})();
	}, []);

	useFocusEffect(
		useCallback(() => {
			check();
			// Leaving the screen cancels the request without a result: with no
			// latest request, its abort passes no guard, and the state stays as
			// it was until the next focus asks again.
			return () => {
				latest.current?.abort();
				latest.current = null;
			};
		}, [check]),
	);

	return { ...state, check };
}

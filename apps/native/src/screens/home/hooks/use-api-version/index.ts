import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { type TApiVersion, versionSchema } from "./lib/version-schema";

const API_VERSION_URL = "https://api-stg-medusa.fabianalula.site/version";

type TApiVersionStatus = "checking" | "ok" | "failed";

type TApiVersionState = {
	status: TApiVersionStatus;
	version: TApiVersion | null;
};

/**
 * What the stg API answers at `/version`, asked again each time the screen
 * comes into focus and whenever `check` is called. A non-2xx answer, a
 * network error and a body that does not parse all end as `failed`.
 */
export function useApiVersion(): TApiVersionState & { check: () => void } {
	const [state, setState] = useState<TApiVersionState>({
		status: "checking",
		version: null,
	});
	// Only the latest request may set the state, so a slow answer to an
	// earlier one never overwrites a newer result.
	const latest = useRef(0);

	const check = useCallback(() => {
		const request = ++latest.current;
		setState({ status: "checking", version: null });

		void (async () => {
			try {
				const response = await fetch(API_VERSION_URL);
				if (!response.ok) throw new Error(`status ${response.status}`);
				const version = versionSchema.parse(await response.json());
				if (request === latest.current) setState({ status: "ok", version });
			} catch {
				if (request === latest.current) {
					setState({ status: "failed", version: null });
				}
			}
		})();
	}, []);

	useFocusEffect(check);

	return { ...state, check };
}

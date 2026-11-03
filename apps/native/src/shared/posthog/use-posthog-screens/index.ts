import { usePathname } from "expo-router";
import { useEffect } from "react";
import { posthog } from "@/shared/posthog";

/** Sends a `$screen` with the pathname on every route change. */
export function usePostHogScreens(): void {
	const pathname = usePathname();

	useEffect(() => {
		void posthog.screen(pathname);
	}, [pathname]);
}

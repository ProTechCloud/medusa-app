/**
 * Stands in for `posthog-react-native`, registered in `mocks.ts`, so a test
 * never starts the SDK. `mockPostHogOptions` answers what the client was built
 * with, and `mockScreen` records each `posthog.screen`.
 */
export const mockScreen = jest.fn(async () => undefined);

let options: unknown;

export function mockPostHogOptions(): unknown {
	return options;
}

export default class PostHog {
	screen = mockScreen;

	constructor(_projectToken: string, clientOptions: unknown) {
		options = clientOptions;
	}
}

export const PostHogProvider = ({ children }: { children: React.ReactNode }) =>
	children;

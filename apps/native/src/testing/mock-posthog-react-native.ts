/**
 * Stands in for `posthog-react-native`, registered in `mocks.ts`, so a test
 * never starts the SDK. `mockPostHogOptions` answers what the client was built
 * with, `mockPostHogProviderProps` what the provider was rendered with, and
 * `mockScreen` records each `posthog.screen`.
 */
export const mockScreen = jest.fn(async () => undefined);

let options: unknown;
let providerProps: unknown;

export function mockPostHogOptions(): unknown {
	return options;
}

export function mockPostHogProviderProps(): unknown {
	return providerProps;
}

export default class PostHog {
	screen = mockScreen;

	constructor(_projectToken: string, clientOptions: unknown) {
		options = clientOptions;
	}
}

export const PostHogProvider = ({
	children,
	...props
}: {
	children: React.ReactNode;
}) => {
	providerProps = props;
	return children;
};

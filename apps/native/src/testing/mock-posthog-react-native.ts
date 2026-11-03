/**
 * Stands in for `posthog-react-native`, registered in `mocks.ts`, so a test
 * never starts the SDK. `mockPostHogToken` and `mockPostHogOptions` answer what
 * the client was built with, `mockPostHogProviderProps` what the provider was rendered with, and
 * `mockScreen` records each `posthog.screen`.
 */
export const mockScreen = jest.fn(async () => undefined);

let token: string | undefined;
let options: unknown;
let providerProps: unknown;

export function mockPostHogToken(): string | undefined {
	return token;
}

export function mockPostHogOptions(): unknown {
	return options;
}

export function mockPostHogProviderProps(): unknown {
	return providerProps;
}

export default class PostHog {
	screen = mockScreen;

	constructor(projectToken: string, clientOptions: unknown) {
		token = projectToken;
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

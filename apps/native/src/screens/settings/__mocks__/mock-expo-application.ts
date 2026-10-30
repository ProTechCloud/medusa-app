type TBuild = {
	nativeApplicationVersion: string | null;
	nativeBuildVersion: string | null;
};

let build: TBuild = {
	nativeApplicationVersion: null,
	nativeBuildVersion: null,
};

/** Sets what the build reports; both start as `null`, as on a build with none. */
export function setBuild(values: Partial<TBuild>): void {
	build = { ...build, ...values };
}

/**
 * Stands in for `expo-application`, whose values come from the native build.
 * A test wires it with
 * `jest.mock("expo-application", () => require(<this file>).expoApplication)`.
 * The getters read the values at render, after the test set them.
 */
export const expoApplication = {
	__esModule: true,
	get nativeApplicationVersion() {
		return build.nativeApplicationVersion;
	},
	get nativeBuildVersion() {
		return build.nativeBuildVersion;
	},
};

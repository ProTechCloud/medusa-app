import { faker } from "@faker-js/faker";
import { parseAppConfig } from "@/config/app-config";

describe("parseAppConfig", () => {
	it.each(["dev", "stg", "prd"] as const)(
		"a build for %s parses to that environment",
		(appEnv) => {
			expect(parseAppConfig({ appEnv })).toEqual({ appEnv });
		},
	);

	it.each([
		{ label: "no extra at all", extra: undefined },
		{ label: "an extra without appEnv", extra: {} },
	])("$label is refused, naming APP_ENV as not set", ({ extra }) => {
		expect(() => parseAppConfig(extra)).toThrow("APP_ENV: is not set");
	});

	it("an unknown environment is refused as invalid, by its variable, without its value", () => {
		const appEnv = faker.string.alpha(12);

		const parse = () => parseAppConfig({ appEnv });

		expect(parse).toThrow(/APP_ENV: /);
		expect(parse).not.toThrow("is not set");
		expect(parse).not.toThrow(appEnv);
	});
});

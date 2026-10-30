import { faker } from "@faker-js/faker";

/** A reverse-DNS bundle ID, such as `com.acme.medusa`. */
export function generateBundleId(): string {
	const label = () => faker.string.alpha({ length: 8, casing: "lower" });
	return `com.${label()}.${label()}`;
}

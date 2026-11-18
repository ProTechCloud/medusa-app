import { faker } from "@faker-js/faker";
import type { TEventType } from "#src/lib/catalog.ts";
import { mockPubSub } from "#src/pubsub-bus/__mocks__/mock-pubsub.ts";
import { createPubSubBusOn } from "#src/pubsub-bus/index.ts";
import { generateCodeRequest } from "#src/testing/index.ts";

describe("createPubSubBusOn", () => {
	it.each<TEventType>(["signup.code_requested", "password.reset_requested"])(
		"publishes %s to the emails topic, with its type as an attribute",
		async (type) => {
			const { pubsub, sent } = mockPubSub();
			const emailsTopic = faker.lorem.slug();
			const bus = createPubSubBusOn(pubsub, { emails: emailsTopic });

			const envelope = await bus.publish(type, generateCodeRequest());

			expect(sent).toEqual([
				{ topic: emailsTopic, json: envelope, attributes: { type } },
			]);
		},
	);
});

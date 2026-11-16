import { faker } from "@faker-js/faker";
import { generateCodeRequest } from "../../__mocks__/generate-code-request";
import type { TEventType } from "../../catalog";
import { createCapturingPubSub } from "../__mocks__/mock-pubsub";
import { createPubSubBus } from "../pubsub";

describe("createPubSubBus", () => {
	it.each<TEventType>(["signup.code_requested", "password.reset_requested"])(
		"publishes %s to the emails topic, with its type as an attribute",
		async (type) => {
			const { pubsub, sent } = createCapturingPubSub();
			const emailsTopic = faker.lorem.slug();
			const bus = createPubSubBus({ pubsub, topics: { emails: emailsTopic } });

			const envelope = await bus.publish(type, generateCodeRequest());

			expect(sent).toEqual([
				{ topic: emailsTopic, json: envelope, attributes: { type } },
			]);
		},
	);
});

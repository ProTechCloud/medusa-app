import { faker } from "@faker-js/faker";
import type { TEventType } from "../../lib/catalog";
import { generateCodeRequest } from "../../testing";
import { createPubSubBusOn } from "..";
import { createCapturingPubSub } from "../__mocks__/mock-pubsub";

describe("createPubSubBusOn", () => {
	it.each<TEventType>(["signup.code_requested", "password.reset_requested"])(
		"publishes %s to the emails topic, with its type as an attribute",
		async (type) => {
			const { pubsub, sent } = createCapturingPubSub();
			const emailsTopic = faker.lorem.slug();
			const bus = createPubSubBusOn(pubsub, { emails: emailsTopic });

			const envelope = await bus.publish(type, generateCodeRequest());

			expect(sent).toEqual([
				{ topic: emailsTopic, json: envelope, attributes: { type } },
			]);
		},
	);
});

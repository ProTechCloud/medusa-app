import { PubSub } from "@google-cloud/pubsub";
import type { IMessageBus } from "../lib/bus";
import { EVENTS, type TTopic } from "../lib/catalog";
import { createEnvelope } from "../lib/envelope";

type TTopics = Record<TTopic, string>;

/**
 * A bus that publishes each envelope as JSON to its topic, on a Pub/Sub
 * client built for `projectId`; unset, the client reads the project from the
 * environment. With PUBSUB_EMULATOR_HOST set, it talks to the emulator.
 * `topics` names the Pub/Sub topic each catalog topic publishes to.
 */
export function createPubSubBus({
	projectId,
	topics,
}: {
	projectId?: string;
	topics: TTopics;
}): IMessageBus {
	return createPubSubBusOn(new PubSub({ projectId }), topics);
}

/**
 * The same bus on a client the caller built, as a test passes its own. The
 * event's type goes in an attribute too, so a subscription can filter on it.
 */
export function createPubSubBusOn(
	pubsub: PubSub,
	topics: TTopics,
): IMessageBus {
	return {
		async publish(type, data) {
			const envelope = createEnvelope(type, data);
			await pubsub
				.topic(topics[EVENTS[type].topic])
				.publishMessage({ json: envelope, attributes: { type } });
			return envelope;
		},
	};
}

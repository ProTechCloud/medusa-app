import type { PubSub } from "@google-cloud/pubsub";
import type { IMessageBus } from "../bus";
import { EVENTS, type TTopic } from "../catalog";
import { createEnvelope } from "../envelope";

type Options = {
	pubsub: PubSub;
	/** The Pub/Sub topic name each catalog topic publishes to. */
	topics: Record<TTopic, string>;
};

/**
 * A bus that publishes each envelope as JSON to its topic. The event's type
 * goes in an attribute too, so a subscription can filter on it.
 */
export function createPubSubBus({ pubsub, topics }: Options): IMessageBus {
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

import type { IPublisher } from "#src/pubsub-bus/index.ts";

type Sent = {
	topic: string;
	json: unknown;
	attributes: Record<string, string>;
};

/** A Pub/Sub client that keeps every message published, by topic name. */
export function mockPubSub(): {
	pubsub: IPublisher;
	sent: Sent[];
} {
	const sent: Sent[] = [];
	const pubsub: IPublisher = {
		topic: (topic: string) => ({
			publishMessage: async (message: {
				json: unknown;
				attributes: Record<string, string>;
			}) => {
				sent.push({ topic, ...message });
				return String(sent.length);
			},
		}),
	};
	return { pubsub, sent };
}

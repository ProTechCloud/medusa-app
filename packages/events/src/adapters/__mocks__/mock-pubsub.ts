import type { PubSub } from "@google-cloud/pubsub";

type Sent = {
	topic: string;
	json: unknown;
	attributes: Record<string, string>;
};

/** A Pub/Sub client that keeps every message published, by topic name. */
export function createCapturingPubSub(): {
	pubsub: PubSub;
	sent: Sent[];
} {
	const sent: Sent[] = [];
	const pubsub = {
		topic: (topic: string) => ({
			publishMessage: async (message: {
				json: unknown;
				attributes: Record<string, string>;
			}) => {
				sent.push({ topic, ...message });
				return String(sent.length);
			},
		}),
	} as unknown as PubSub;
	return { pubsub, sent };
}

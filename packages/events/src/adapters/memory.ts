import type { IMessageBus } from "../bus";
import { createEnvelope, type TEnvelope } from "../envelope";

export interface IMemoryBus extends IMessageBus {
	/** Every envelope published, oldest first. */
	readonly published: TEnvelope[];
}

/** A bus that keeps what it publishes in memory, for tests. */
export function createMemoryBus(): IMemoryBus {
	const published: TEnvelope[] = [];
	return {
		published,
		async publish(type, data) {
			const envelope = createEnvelope(type, data);
			published.push(envelope);
			return envelope;
		},
	};
}

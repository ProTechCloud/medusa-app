import type { TEventData, TEventType } from "./catalog";
import type { TEnvelope } from "./envelope";

/** Publishes an event to its topic, and returns the envelope it sent. */
export interface IMessageBus {
	publish<TType extends TEventType>(
		type: TType,
		data: TEventData<TType>,
	): Promise<TEnvelope>;
}

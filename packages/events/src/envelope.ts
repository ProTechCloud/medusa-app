import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
	EVENT_TYPES,
	EVENTS,
	type TEventData,
	type TEventType,
} from "./catalog";

/**
 * What every message carries, whatever its type: an id a consumer can
 * deduplicate on, since delivery is at least once, the time it happened, and
 * the event's data. A union over the catalog, so narrowing on `type` narrows
 * `data`.
 */
export type TEnvelope = {
	[TType in TEventType]: {
		id: string;
		type: TType;
		occurredAt: string;
		data: TEventData<TType>;
	};
}[TEventType];

/** Wraps an event's data, which it validates against the catalog first. */
export function createEnvelope<TType extends TEventType>(
	type: TType,
	data: TEventData<TType>,
): TEnvelope {
	return {
		id: randomUUID(),
		type,
		occurredAt: new Date().toISOString(),
		data: EVENTS[type].data.parse(data),
	} as TEnvelope;
}

const envelopeSchema = z.object({
	id: z.uuid(),
	type: z.enum(EVENT_TYPES),
	occurredAt: z.iso.datetime(),
	data: z.unknown(),
});

/**
 * Reads a received message back into an envelope. Throws when it is not one,
 * or its data does not match its type.
 */
export function parseEnvelope(raw: unknown): TEnvelope {
	const envelope = envelopeSchema.parse(raw);
	return {
		...envelope,
		data: EVENTS[envelope.type].data.parse(envelope.data),
	} as TEnvelope;
}

import { z } from "zod";

// Every event the API publishes: the topic it goes to and the shape of its
// data. Adding one here is the whole of declaring it; the envelope, the bus
// and the worker read its type and schema from this table.

const codeRequested = z.object({
	email: z.email(),
	// Sent in clear to the worker, which emails it; only its hash is stored.
	code: z.string().regex(/^\d{6}$/),
});

export const EVENTS = {
	"signup.code_requested": { topic: "emails", data: codeRequested },
	"password.reset_requested": { topic: "emails", data: codeRequested },
} as const;

export type TEventType = keyof typeof EVENTS;

export type TEventData<TType extends TEventType> = z.infer<
	(typeof EVENTS)[TType]["data"]
>;

export type TTopic = (typeof EVENTS)[TEventType]["topic"];

export const EVENT_TYPES = Object.keys(EVENTS) as [TEventType, ...TEventType[]];

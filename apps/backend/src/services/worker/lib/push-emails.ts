import type { Handler } from "hono";
import { deliverPushedEmailUseCase } from "@/use-cases/cases/deliver-pushed-email.use-case";

export const PUSH_EMAILS_PATH = "/push/emails";

/**
 * One message from the emails topic. A 2xx acknowledges it; anything else
 * and Pub/Sub delivers it again. The use case decides; this answers 401 to
 * a push it did not trust and 204 to one it sent or dropped, and a thrown
 * error reaches the 500.
 */
export const pushEmails: Handler = async (context) => {
	const result = await deliverPushedEmailUseCase({
		authorization: context.req.header("authorization"),
		body: await context.req.json().catch(() => null),
	});
	return context.body(null, result === "unauthorized" ? 401 : 204);
};

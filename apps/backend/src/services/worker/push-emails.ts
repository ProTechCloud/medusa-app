import { parseEnvelope } from "@medusa/events";
import type { Handler } from "hono";
import { z } from "zod";
import { logger } from "@/logger";
import { sendEmailUseCase } from "@/use-cases/cases/send-email.use-case";

export const PUSH_EMAILS_PATH = "/push/emails";

// What a Pub/Sub push subscription posts: the message, its data in base64.
const pushSchema = z.object({
	message: z.object({ messageId: z.string(), data: z.base64() }),
});

/**
 * One message from the emails topic. A 2xx acknowledges it; anything else
 * and Pub/Sub delivers it again. A message that is not an envelope is
 * acknowledged and logged, since no retry would make it one; a send that
 * fails is a 500, so it is retried.
 */
export const pushEmails: Handler = async (context) => {
	let envelope: ReturnType<typeof parseEnvelope>;
	try {
		const { message } = pushSchema.parse(await context.req.json());
		envelope = parseEnvelope(
			JSON.parse(Buffer.from(message.data, "base64").toString("utf8")),
		);
	} catch (error) {
		logger.error({ err: error }, "push dropped: not an email envelope");
		return context.body(null, 204);
	}

	await sendEmailUseCase({ envelope });
	return context.body(null, 204);
};

import { renderEmail } from "@medusa/emails";
import { parseEnvelope, type TEnvelope } from "@medusa/events";
import { z } from "zod";
import { MailgunRefusedError } from "@/mailgun";
import { defineUseCase } from "@/use-cases";

// What a Pub/Sub push subscription posts: the message, its data in base64.
const pushSchema = z.object({
	message: z.object({ messageId: z.string(), data: z.base64() }),
});

/** The envelope a push carries, or null when it carries none. */
function readEnvelope(body: unknown): TEnvelope | null {
	try {
		const { message } = pushSchema.parse(body);
		return parseEnvelope(
			JSON.parse(Buffer.from(message.data, "base64").toString("utf8")),
		);
	} catch {
		return null;
	}
}

/**
 * One push from the emails topic, with the request's `Authorization` header.
 *
 * - `unauthorized`: the push verifier did not trust it; nothing is read.
 * - `dropped`: no retry can succeed, so the push is acknowledged and logged:
 *   the body is not an email envelope, or Mailgun refused the email for
 *   good, such as for a wrong key.
 * - `sent`: rendered and handed to the mailer.
 *
 * Any other failure, such as Mailgun's own or a timeout, is thrown, so the
 * push is answered with an error and Pub/Sub delivers it again.
 */
export const deliverPushedEmailUseCase = defineUseCase<
	{ authorization: string | undefined; body: unknown },
	"unauthorized" | "dropped" | "sent"
>(async function deliverPushedEmailUseCase(ctx, { authorization, body }) {
	if (!(await ctx.pushVerifier.verify(authorization))) {
		ctx.logger.warn("push refused: not from the trusted subscription");
		return "unauthorized";
	}

	const envelope = readEnvelope(body);
	if (!envelope) {
		ctx.logger.error("push dropped: not an email envelope");
		return "dropped";
	}

	try {
		await ctx.mailer.send(await renderEmail(envelope));
	} catch (error) {
		if (error instanceof MailgunRefusedError && !error.retryable) {
			ctx.logger.error(
				{ err: error, envelopeId: envelope.id, type: envelope.type },
				"push dropped: Mailgun refused the email for good",
			);
			return "dropped";
		}
		throw error;
	}
	return "sent";
});

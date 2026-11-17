import { renderEmail } from "@medusa/emails";
import type { TEnvelope } from "@medusa/events";
import { defineUseCase } from "@/use-cases";

/**
 * Renders the email an event asks for and hands it to the mailer: Mailgun
 * when the key is set, else the log, and nothing is sent.
 */
export const sendEmailUseCase = defineUseCase<{ envelope: TEnvelope }, void>(
	async function sendEmailUseCase(ctx, { envelope }) {
		await ctx.mailer.send(await renderEmail(envelope));
	},
);

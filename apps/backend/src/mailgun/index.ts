import type { TRenderedEmail } from "@medusa/emails";
import type { Logger } from "pino";

/** Where the worker hands a rendered email to be delivered. */
export interface IMailer {
	send(email: TRenderedEmail): Promise<void>;
}

// Mailgun's US region; an EU domain is served from api.eu.mailgun.net.
const MAILGUN_API_URL = "https://api.mailgun.net";

/**
 * Sends through Mailgun's HTTP API, as `from` on `domain`. A refusal throws
 * with Mailgun's status, so the push is answered with an error and Pub/Sub
 * delivers it again.
 */
export function createMailgunMailer({
	apiKey,
	domain,
	from,
	apiUrl = MAILGUN_API_URL,
}: {
	apiKey: string;
	domain: string;
	from: string;
	apiUrl?: string;
}): IMailer {
	const authorization = `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`;
	return {
		async send({ to, subject, html }) {
			const response = await fetch(`${apiUrl}/v3/${domain}/messages`, {
				method: "POST",
				headers: { authorization },
				body: new URLSearchParams({ from, to, subject, html }),
			});
			if (!response.ok) {
				throw new Error(
					`Mailgun refused the email with ${response.status}: ${await response.text()}`,
				);
			}
		},
	};
}

/**
 * Without a Mailgun key: sends nothing and logs what it would have sent,
 * without the body, which holds the code. The code 111111 is accepted
 * instead.
 */
export function createLogMailer(logger: Logger): IMailer {
	return {
		async send({ to, subject }) {
			logger.info({ to, subject }, "email not sent: no MAILGUN_API_KEY");
		},
	};
}

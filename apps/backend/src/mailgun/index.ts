import type { TRenderedEmail } from "@medusa/emails";
import type { Logger } from "pino";

/** Where the worker hands a rendered email to be delivered. */
export interface IMailer {
	send(email: TRenderedEmail): Promise<void>;
}

// Mailgun's US region; an EU domain is served from api.eu.mailgun.net.
const MAILGUN_API_URL = "https://api.mailgun.net";

// Past this a stalled send throws, and the push is answered with an error
// Pub/Sub retries, well inside its acknowledgement deadline.
const MAILGUN_TIMEOUT_MS = 10_000;

/**
 * Mailgun answered with an error. `retryable` says whether sending again can
 * work: Mailgun's own failure (5xx), a timeout (408) or its rate limit (429).
 * Any other 4xx, such as a wrong key or a sender off the domain, fails the
 * same way every time.
 */
export class MailgunRefusedError extends Error {
	override name = "MailgunRefusedError";
	readonly retryable: boolean;

	constructor(
		readonly status: number,
		detail: string,
	) {
		super(`Mailgun refused the email with ${status}: ${detail}`);
		this.retryable = status >= 500 || status === 408 || status === 429;
	}
}

/**
 * Sends through Mailgun's HTTP API, as `from` on `domain`. An error answer
 * throws `MailgunRefusedError`, and a send that takes longer than
 * `timeoutMs` throws a `TimeoutError`.
 */
export function createMailgunMailer({
	apiKey,
	domain,
	from,
	apiUrl = MAILGUN_API_URL,
	timeoutMs = MAILGUN_TIMEOUT_MS,
}: {
	apiKey: string;
	domain: string;
	from: string;
	apiUrl?: string;
	timeoutMs?: number;
}): IMailer {
	const authorization = `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`;
	return {
		async send({ to, subject, html }) {
			const response = await fetch(`${apiUrl}/v3/${domain}/messages`, {
				method: "POST",
				headers: { authorization },
				body: new URLSearchParams({ from, to, subject, html }),
				signal: AbortSignal.timeout(timeoutMs),
			});
			if (!response.ok) {
				throw new MailgunRefusedError(response.status, await response.text());
			}
		},
	};
}

/**
 * Without a Mailgun key: sends nothing and logs what it would have sent,
 * without the body, which holds the code. A local API accepts the code
 * 111111 instead.
 */
export function createLogMailer(logger: Logger): IMailer {
	return {
		async send({ to, subject }) {
			logger.info({ to, subject }, "email not sent: no MAILGUN_API_KEY");
		},
	};
}

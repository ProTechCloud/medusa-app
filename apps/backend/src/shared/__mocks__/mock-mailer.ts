import type { TRenderedEmail } from "@medusa/emails";
import type { IMailer } from "@/mailgun";

export interface IMemoryMailer extends IMailer {
	/** Every email sent, oldest first. */
	readonly sent: TRenderedEmail[];
}

/** A mailer that keeps what it sends in memory, for tests. */
export function mockMailer(): IMemoryMailer {
	const sent: TRenderedEmail[] = [];
	return {
		sent,
		async send(email) {
			sent.push(email);
		},
	};
}

/** A mailer whose every send throws `error`, for the paths that handle it. */
export function mockFailingMailer(error: Error): IMailer {
	return {
		async send() {
			throw error;
		},
	};
}

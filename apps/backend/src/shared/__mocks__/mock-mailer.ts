import type { TRenderedEmail } from "@medusa/emails";
import type { IMailer } from "@/mailgun";

export interface IMemoryMailer extends IMailer {
	/** Every email sent, oldest first. */
	readonly sent: TRenderedEmail[];
}

/** A mailer that keeps what it sends in memory, for tests. */
export function createMemoryMailer(): IMemoryMailer {
	const sent: TRenderedEmail[] = [];
	return {
		sent,
		async send(email) {
			sent.push(email);
		},
	};
}

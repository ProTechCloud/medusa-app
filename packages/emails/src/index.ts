import type { EVENTS, TEnvelope, TEventType } from "@medusa/events";
import type { ReactElement } from "react";
import { render } from "react-email";
import { PasswordResetEmail } from "./templates/password-reset";
import { SignUpCodeEmail } from "./templates/signup-code";

// One entry per event on the emails topic. The events catalog is the source
// of truth: an event added there on that topic without an entry here fails
// to compile.
export type TEmailType = {
	[TType in TEventType]: (typeof EVENTS)[TType]["topic"] extends "emails"
		? TType
		: never;
}[TEventType];

type TEmailEnvelope = Extract<TEnvelope, { type: TEmailType }>;

type Template<TType extends TEmailType> = {
	subject: string;
	build: (
		data: Extract<TEmailEnvelope, { type: TType }>["data"],
	) => ReactElement;
};

const TEMPLATES: { [TType in TEmailType]: Template<TType> } = {
	"signup.code_requested": {
		subject: "Your Medusa sign-up code",
		build: ({ code }) => SignUpCodeEmail({ code }),
	},
	"password.reset_requested": {
		subject: "Your Medusa password reset code",
		build: ({ code }) => PasswordResetEmail({ code }),
	},
};

export type TRenderedEmail = { to: string; subject: string; html: string };

/** Renders the email an event asks for, ready to send. */
export async function renderEmail(
	envelope: TEmailEnvelope,
): Promise<TRenderedEmail> {
	const template = TEMPLATES[envelope.type] as Template<typeof envelope.type>;
	return {
		to: envelope.data.email,
		subject: template.subject,
		html: await render(template.build(envelope.data)),
	};
}

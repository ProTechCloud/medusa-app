import type { IMemoryBus, TEventType } from "@medusa/events";
import { generateSignUp } from "@/shared/__mocks__/generate-sign-up";
import { requestSignUpCodeUseCase } from "@/use-cases/cases/request-sign-up-code.use-case";
import { signUpUseCase } from "@/use-cases/cases/sign-up.use-case";

/** The code in the last email of `type` published to `email`. */
export function lastCode(
	bus: IMemoryBus,
	type: TEventType,
	email: string,
): string {
	const envelope = bus.published.findLast(
		(published) => published.type === type && published.data.email === email,
	);
	if (!envelope) throw new Error(`No ${type} was published to ${email}`);
	return envelope.data.code;
}

/** A request's headers, with a bearer token when given one. */
export function requestHeaders(token?: string): Headers {
	return new Headers(token ? { authorization: `Bearer ${token}` } : {});
}

/**
 * Signs a new user up the way a client does: asks for a code, reads it from
 * the email the bus would have sent, and signs up with it.
 */
export async function signUpTestUser(bus: IMemoryBus) {
	const details = generateSignUp();
	await requestSignUpCodeUseCase({
		email: details.email,
		headers: requestHeaders(),
	});
	const session = await signUpUseCase({
		...details,
		code: lastCode(bus, "signup.code_requested", details.email),
		headers: requestHeaders(),
	});
	return { ...details, ...session };
}

import { z } from "zod";
import type { Resolvers } from "@/__generated__/resolvers-types";
import {
	ChangePasswordInputSchema,
	RequestPasswordResetInputSchema,
	RequestSignUpCodeInputSchema,
	ResetPasswordInputSchema,
	SignInInputSchema,
	SignUpInputSchema,
} from "@/__generated__/validation";
import { MAX_PASSWORD_LENGTH } from "@/better-auth";
import { parseInput } from "@/services/api/graphql/lib/parse-input";
import { changePasswordUseCase } from "@/use-cases/cases/change-password.use-case";
import { loadMeUseCase } from "@/use-cases/cases/load-me.use-case";
import { requestPasswordResetUseCase } from "@/use-cases/cases/request-password-reset.use-case";
import { requestSignUpCodeUseCase } from "@/use-cases/cases/request-sign-up-code.use-case";
import { resetPasswordUseCase } from "@/use-cases/cases/reset-password.use-case";
import { signInUseCase } from "@/use-cases/cases/sign-in.use-case";
import { signOutUseCase } from "@/use-cases/cases/sign-out.use-case";
import { signUpUseCase } from "@/use-cases/cases/sign-up.use-case";

// The generated schemas know only that each field is a string; these add
// what the schema cannot say. An address is compared lowercased, so a
// sign-up and a sign-in never disagree on its case, and capped at the
// longest an address can be, as every text a client sends is.
const email = z
	.string()
	.trim()
	.toLowerCase()
	.max(254, "is too long")
	.pipe(z.email("is not an email"));
const code = z.string().regex(/^\d{6}$/, "must be 6 digits");
const name = z.string().trim().min(1, "is required").max(100, "is too long");
const password = z.string().max(MAX_PASSWORD_LENGTH, "is too long");

const inputs = {
	requestSignUpCode: RequestSignUpCodeInputSchema().extend({ email }),
	signUp: SignUpInputSchema().extend({ email, code, name, password }),
	signIn: SignInInputSchema().extend({ email, password }),
	requestPasswordReset: RequestPasswordResetInputSchema().extend({ email }),
	resetPassword: ResetPasswordInputSchema().extend({
		email,
		code,
		newPassword: password,
	}),
	changePassword: ChangePasswordInputSchema().extend({
		currentPassword: password,
		newPassword: password,
	}),
};

/** One use case per field, called with the parsed input and the headers. */
export function createAuthResolvers(): Resolvers {
	return {
		Query: {
			me: (_, __, { headers }) => loadMeUseCase({ headers }),
		},
		Mutation: {
			requestSignUpCode: (_, args, { headers }) =>
				requestSignUpCodeUseCase({
					...parseInput(inputs.requestSignUpCode, args.input),
					headers,
				}),
			signUp: (_, args, { headers }) =>
				signUpUseCase({ ...parseInput(inputs.signUp, args.input), headers }),
			signIn: (_, args, { headers }) =>
				signInUseCase({ ...parseInput(inputs.signIn, args.input), headers }),
			signOut: (_, __, { headers }) => signOutUseCase({ headers }),
			requestPasswordReset: (_, args, { headers }) =>
				requestPasswordResetUseCase({
					...parseInput(inputs.requestPasswordReset, args.input),
					headers,
				}),
			resetPassword: (_, args, { headers }) =>
				resetPasswordUseCase({
					...parseInput(inputs.resetPassword, args.input),
					headers,
				}),
			changePassword: (_, args, { headers }) =>
				changePasswordUseCase({
					...parseInput(inputs.changePassword, args.input),
					headers,
				}),
		},
	};
}

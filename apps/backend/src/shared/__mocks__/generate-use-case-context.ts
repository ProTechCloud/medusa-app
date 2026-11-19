import { createMemoryBus, type IMessageBus } from "@medusa/events";
import type { Logger } from "pino";
import type { TConfig } from "@/config";
import { testLogger } from "@/testing/test-logger";
import { buildUseCaseContext } from "@/use-cases";
import { generateConfig } from "./generate-config";
import { mockMailer } from "./mock-mailer";
import { mockPushVerifier } from "./mock-push-verifier";

/**
 * A complete use-case context for a test that does not query the database:
 * a random config, a silent logger, the memory bus, the memory mailer and a
 * push verifier that trusts every push, unless overridden.
 * Its database pool points nowhere and never connects unless queried.
 */
export function generateUseCaseContext(
	overrides: { config?: TConfig; logger?: Logger; bus?: IMessageBus } = {},
) {
	return buildUseCaseContext({
		config: overrides.config ?? generateConfig(),
		logger: overrides.logger ?? testLogger,
		bus: overrides.bus ?? createMemoryBus(),
		mailer: mockMailer(),
		pushVerifier: mockPushVerifier(true),
	});
}

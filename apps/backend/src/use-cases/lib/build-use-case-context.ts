import { createDb } from "@medusa/db";
import { createPubSubBus, type IMessageBus } from "@medusa/events";
import type { Logger } from "pino";
import { createAuth } from "@/better-auth";
import { getConfig, type TConfig } from "@/config";
import {
	createClosedPushVerifier,
	createGooglePushVerifier,
	createLocalPushVerifier,
	type IPushVerifier,
} from "@/google-auth";
import { logger } from "@/logger";
import { createLogMailer, createMailgunMailer, type IMailer } from "@/mailgun";
import type { TUseCaseContext } from "@/use-cases";

/**
 * The mailer and the push verifier a service runs with, from its config:
 * Mailgun with a key, else the log; Google's token check with the push
 * variables, else trust for a local emulator, which sends no token, and
 * refusal anywhere else.
 */
export function chooseServiceClients(
	config: TConfig,
	logger: Logger,
): { mailer: IMailer; pushVerifier: IPushVerifier } {
	const { apiKey, domain, from, apiUrl } = config.mailgun;
	const { push } = config.pubsub;
	return {
		// The config refuses a key without its domain and sender.
		mailer:
			apiKey && domain && from
				? createMailgunMailer({ apiKey, domain, from, apiUrl })
				: createLogMailer(logger),
		pushVerifier: push
			? createGooglePushVerifier(push)
			: config.environment === "local"
				? createLocalPushVerifier()
				: createClosedPushVerifier(logger),
	};
}

/**
 * A service's context, for its entry point to pass to `initUseCaseContext`:
 * the config given, else the process's, the Pub/Sub bus, the mailer, the push verifier, and
 * a first query, so a database that does not answer stops the boot instead
 * of the first request.
 * With PUBSUB_EMULATOR_HOST set, the Pub/Sub client talks to the emulator.
 */
export async function createServiceContext(
	config: TConfig = getConfig(),
): Promise<TUseCaseContext> {
	const bus = createPubSubBus({
		projectId: config.pubsub.projectId,
		topics: { emails: config.pubsub.emailsTopic },
	});
	const { mailer, pushVerifier } = chooseServiceClients(config, logger);
	const context = buildUseCaseContext({
		config,
		logger,
		bus,
		mailer,
		pushVerifier,
	});
	await context.db.$client.query("select 1");
	return context;
}

/**
 * Every client the use cases reach, from the config. The bus, the mailer and
 * the push verifier are passed in: Pub/Sub, Mailgun and Google in a service,
 * their doubles in a test. Nothing here connects yet;
 * the pool opens its first connection on the first query.
 */
export function buildUseCaseContext({
	config,
	logger,
	bus,
	mailer,
	pushVerifier,
}: {
	config: TConfig;
	logger: Logger;
	bus: IMessageBus;
	mailer: IMailer;
	pushVerifier: IPushVerifier;
}): TUseCaseContext {
	const db = createDb(config.db.url);
	const { auth, sessionCache } = createAuth(db, config);
	return { config, logger, db, auth, sessionCache, bus, mailer, pushVerifier };
}

import { PubSub } from "@google-cloud/pubsub";
import { createDb } from "@medusa/db";
import { createPubSubBus, type IMessageBus } from "@medusa/events";
import type { Logger } from "pino";
import { createAuth } from "@/better-auth";
import { getConfig, type TConfig } from "@/config";
import { logger } from "@/logger";
import { createLogMailer, createMailgunMailer, type IMailer } from "@/mailgun";
import type { TUseCaseContext } from "@/use-cases";

/**
 * A service's context, for its entry point to pass to `initUseCaseContext`:
 * the process's config, the Pub/Sub bus, the mailer, and a first query, so a
 * database that does not answer stops the boot instead of the first request.
 * With PUBSUB_EMULATOR_HOST set, the Pub/Sub client talks to the emulator.
 */
export async function createServiceContext(): Promise<TUseCaseContext> {
	const config = getConfig();
	const bus = createPubSubBus({
		pubsub: new PubSub({ projectId: config.pubsub.projectId }),
		topics: { emails: config.pubsub.emailsTopic },
	});
	const { apiKey, domain, from } = config.mailgun;
	// The config refuses a key without its domain and sender.
	const mailer =
		apiKey && domain && from
			? createMailgunMailer({ apiKey, domain, from })
			: createLogMailer(logger);
	const context = buildUseCaseContext({ config, logger, bus, mailer });
	await context.db.$client.query("select 1");
	return context;
}

/**
 * Every client the use cases reach, from the config. The bus and the mailer
 * are passed in: Pub/Sub and Mailgun in a service, their memory doubles in a
 * test. Nothing here connects yet;
 * the pool opens its first connection on the first query.
 */
export function buildUseCaseContext({
	config,
	logger,
	bus,
	mailer,
}: {
	config: TConfig;
	logger: Logger;
	bus: IMessageBus;
	mailer: IMailer;
}): TUseCaseContext {
	const db = createDb(config.db.url);
	const { auth, sessionCache } = createAuth(db, config);
	return { config, logger, db, auth, sessionCache, bus, mailer };
}

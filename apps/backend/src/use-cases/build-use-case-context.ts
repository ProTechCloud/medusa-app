import { PubSub } from "@google-cloud/pubsub";
import { createDb } from "@medusa/db";
import { createPubSubBus, type IMessageBus } from "@medusa/events";
import type { Logger } from "pino";
import { createAuth } from "@/better-auth";
import { getConfig, type TConfig } from "@/config";
import { logger } from "@/logger";
import type { TUseCaseContext } from "@/use-cases";

/**
 * A service's context, for its entry point to pass to `initUseCaseContext`:
 * the process's config, the Pub/Sub bus, and a first query, so a database
 * that does not answer stops the boot instead of the first request. With
 * PUBSUB_EMULATOR_HOST set, the Pub/Sub client talks to the emulator.
 */
export async function createServiceContext(): Promise<TUseCaseContext> {
	const config = getConfig();
	const bus = createPubSubBus({
		pubsub: new PubSub({ projectId: config.pubsub.projectId }),
		topics: { emails: config.pubsub.emailsTopic },
	});
	const context = buildUseCaseContext({ config, logger, bus });
	await context.db.$client.query("select 1");
	return context;
}

/**
 * Every client the use cases reach, from the config. The bus is passed in:
 * Pub/Sub in a service, the memory bus in a test. Nothing here connects yet;
 * the pool opens its first connection on the first query.
 */
export function buildUseCaseContext({
	config,
	logger,
	bus,
}: {
	config: TConfig;
	logger: Logger;
	bus: IMessageBus;
}): TUseCaseContext {
	const db = createDb(config.db.url);
	const { auth, sessionCache } = createAuth(db, config);
	return { config, logger, db, auth, sessionCache, bus };
}

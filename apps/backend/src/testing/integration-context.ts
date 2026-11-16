import { createMemoryBus, type IMemoryBus } from "@medusa/events";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { generateConfig } from "@/shared/__mocks__/generate-config";
import {
	ctxForTests,
	resetCtx,
	setCtxForTests,
	type TUseCaseContext,
} from "@/use-cases";
import { buildUseCaseContext } from "@/use-cases/build-use-case-context";
import { createDbCloner, TEST_DB_URL_ENV } from "./test-db";
import { testLogger } from "./test-logger";

/**
 * For a test file whose use cases query the database: before each test, a
 * database of its own, cloned from the migrated template, with Better Auth
 * on it and the memory bus; after it, the database is dropped. Returns
 * accessors for what a test asserts on.
 */
export function integrationContextForEachTest(
	configOverrides: Parameters<typeof generateConfig>[0] = {},
): { ctx: () => TUseCaseContext; bus: () => IMemoryBus } {
	let cloner: ReturnType<typeof createDbCloner>;
	let drop: (() => Promise<void>) | undefined;
	let bus: IMemoryBus;

	beforeAll(() => {
		const url = process.env[TEST_DB_URL_ENV];
		if (!url) {
			throw new Error(
				`${TEST_DB_URL_ENV} is not set: vitest.config.ts must list src/testing/global-setup.ts as its globalSetup.`,
			);
		}
		cloner = createDbCloner(url);
	});

	beforeEach(async () => {
		const clone = await cloner.clone();
		drop = clone.drop;
		bus = createMemoryBus();
		setCtxForTests(
			buildUseCaseContext({
				config: generateConfig({
					...configOverrides,
					db: { url: clone.url },
				}),
				logger: testLogger,
				bus,
			}),
		);
	});

	afterEach(async () => {
		await ctxForTests().db.$client.end();
		resetCtx();
		await drop?.();
	});

	afterAll(async () => {
		await cloner.close();
	});

	return { ctx: ctxForTests, bus: () => bus };
}

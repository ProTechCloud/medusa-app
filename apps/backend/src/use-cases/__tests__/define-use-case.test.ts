import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { generateConfig } from "@/shared/__mocks__/generate-config";
import { createCapturingLogger, testLogger } from "@/testing/test-logger";
import { useCaseContextForEachTest } from "@/testing/use-case-context";
import {
	ctxForTests,
	defineUseCase,
	initUseCaseContext,
	resetCtx,
	setCtxForTests,
} from "@/use-cases";

describe("defineUseCase", () => {
	useCaseContextForEachTest();

	it("the body receives the registered context and the caller's arguments", async () => {
		const config = generateConfig();
		setCtxForTests({ config, logger: createCapturingLogger().logger });
		const greet = defineUseCase<{ name: string }, string>(
			async function greetUseCase(ctx, args) {
				return `${args.name} on ${ctx.config.environment}`;
			},
		);
		const name = faker.person.firstName();

		await expect(greet({ name })).resolves.toBe(
			`${name} on ${config.environment}`,
		);
	});

	it("a successful call is logged by name, with its duration", async () => {
		const capture = createCapturingLogger();
		setCtxForTests({ config: generateConfig(), logger: capture.logger });
		const work = defineUseCase(async function workUseCase() {});

		await work();

		expect(capture.lines()).toEqual([
			expect.objectContaining({
				useCase: "workUseCase",
				msg: "workUseCase called",
			}),
			expect.objectContaining({
				useCase: "workUseCase",
				msg: "workUseCase ok",
				durationMs: expect.any(Number),
			}),
		]);
	});

	it("a failure reaches the caller unchanged and is logged as failed", async () => {
		const capture = createCapturingLogger();
		setCtxForTests({ config: generateConfig(), logger: capture.logger });
		const failure = new Error(faker.lorem.sentence());
		const broken = defineUseCase(async function brokenUseCase() {
			throw failure;
		});

		await expect(broken()).rejects.toBe(failure);
		expect(capture.lines().at(-1)).toEqual(
			expect.objectContaining({
				useCase: "brokenUseCase",
				msg: "brokenUseCase failed",
				durationMs: expect.any(Number),
			}),
		);
	});

	it("an anonymous body is refused when the use case is defined", () => {
		expect(() => defineUseCase((async () => {}) as never)).toThrow(
			/named function/,
		);
	});

	it("a call before any context is registered fails and says how to register one", async () => {
		resetCtx();
		const work = defineUseCase(async function workUseCase() {});

		await expect(work()).rejects.toThrow(/initUseCaseContext/);
	});

	it("a test that reads the context before registering one fails at that read", () => {
		resetCtx();

		expect(() => ctxForTests()).toThrow(/setCtxForTests/);
	});
});

describe("initUseCaseContext", () => {
	useCaseContextForEachTest();

	it("builds once, however many callers ask while the build runs", async () => {
		resetCtx();
		const context = { config: generateConfig(), logger: testLogger };
		let builds = 0;
		const build = async () => {
			builds += 1;
			return context;
		};

		const contexts = await Promise.all([
			initUseCaseContext(build),
			initUseCaseContext(build),
		]);

		expect(builds).toBe(1);
		expect(contexts).toEqual([context, context]);
	});

	it("a use case called while the context is still building waits for it", async () => {
		resetCtx();
		const config = generateConfig();
		const built = initUseCaseContext(async () => ({
			config,
			logger: testLogger,
		}));
		const environment = defineUseCase(async function environmentUseCase(ctx) {
			return ctx.config.environment;
		});

		const answer = environment();

		await built;
		await expect(answer).resolves.toBe(config.environment);
	});

	it("a failed build fails the boot, and the next call builds again", async () => {
		resetCtx();
		const failure = new Error(faker.lorem.sentence());
		const context = { config: generateConfig(), logger: testLogger };

		await expect(
			initUseCaseContext(async () => {
				throw failure;
			}),
		).rejects.toBe(failure);
		await expect(initUseCaseContext(async () => context)).resolves.toBe(
			context,
		);
	});
});

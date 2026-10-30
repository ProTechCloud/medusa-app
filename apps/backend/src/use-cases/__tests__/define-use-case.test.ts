import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { generateConfig } from "@/shared/__mocks__/generate-config";
import { createCapturingLogger } from "@/testing/test-logger";
import { useCaseContextForEachTest } from "@/testing/use-case-context";
import {
	ctxForTests,
	defineUseCase,
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

		expect(ctxForTests()).toBeNull();
		await expect(work()).rejects.toThrow(/initUseCaseContext/);
	});
});

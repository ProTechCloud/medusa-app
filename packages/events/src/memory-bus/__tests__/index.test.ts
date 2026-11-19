import { createMemoryBus } from "#src/memory-bus/index.ts";
import { generateCodeRequest } from "#src/testing/index.ts";

describe("createMemoryBus", () => {
	it("keeps every envelope it publishes, in order", async () => {
		const bus = createMemoryBus();
		const first = generateCodeRequest();
		const second = generateCodeRequest();

		await bus.publish("signup.code_requested", first);
		await bus.publish("password.reset_requested", second);

		expect(bus.published).toMatchObject([
			{ type: "signup.code_requested", data: first },
			{ type: "password.reset_requested", data: second },
		]);
	});
});

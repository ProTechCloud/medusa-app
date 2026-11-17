import { generateCodeRequest } from "../../__mocks__/generate-code-request";
import { createMemoryBus } from "..";

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

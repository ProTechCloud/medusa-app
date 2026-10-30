import { faker } from "@faker-js/faker";
import {
	createAppStore,
	resetAllStores,
	resetMemberStores,
} from "@/shared/zustand";

type TValueState = { value: string; setValue: (value: string) => void };

const memberStore = createAppStore<TValueState>("member", (set) => ({
	value: faker.lorem.word(),
	setValue: (value) => set({ value }),
}));

const deviceStore = createAppStore<TValueState>("device", (set) => ({
	value: faker.lorem.word(),
	setValue: (value) => set({ value }),
}));

const initialMember = memberStore.getState().value;
const initialDevice = deviceStore.getState().value;

function changeBoth(): { member: string; device: string } {
	const member = faker.string.uuid();
	const device = faker.string.uuid();
	memberStore.getState().setValue(member);
	deviceStore.getState().setValue(device);
	return { member, device };
}

describe("app stores", () => {
	it("sign-out resets the member's stores and keeps the device's", () => {
		const { device } = changeBoth();

		resetMemberStores();

		expect(memberStore.getState().value).toBe(initialMember);
		expect(deviceStore.getState().value).toBe(device);
	});

	it("resetting every store returns both scopes to their initial state", () => {
		changeBoth();

		resetAllStores();

		expect(memberStore.getState().value).toBe(initialMember);
		expect(deviceStore.getState().value).toBe(initialDevice);
	});

	it("a reset keeps the store's actions working", () => {
		changeBoth();
		resetAllStores();
		const value = faker.string.uuid();

		memberStore.getState().setValue(value);

		expect(memberStore.getState().value).toBe(value);
	});
});

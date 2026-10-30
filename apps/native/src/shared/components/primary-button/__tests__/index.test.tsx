import { faker } from "@faker-js/faker";
import { render, screen, userEvent } from "@testing-library/react-native";
import { PrimaryButton } from "@/shared/components/primary-button";
import { createPressHandler } from "@/shared/components/primary-button/__mocks__/mock-press-handler";

describe("PrimaryButton", () => {
	it.each(["solid", "outline", "danger"] as const)(
		"a %s button runs its action when pressed",
		async (variant) => {
			const onPress = createPressHandler();
			const label = faker.lorem.words(2);
			render(
				<PrimaryButton
					label={label}
					onPress={onPress}
					testID="button"
					variant={variant}
				/>,
			);

			await userEvent.press(screen.getByTestId("button"));

			expect(onPress).toHaveBeenCalledTimes(1);
			expect(screen.getByText(label)).toBeOnTheScreen();
		},
	);

	it("while loading it shows a spinner, keeps its label as its name and ignores presses", async () => {
		const onPress = createPressHandler();
		const label = faker.lorem.words(2);
		render(
			<PrimaryButton label={label} onPress={onPress} testID="button" loading />,
		);

		await userEvent.press(screen.getByTestId("button"));

		expect(screen.getByTestId("button-loading")).toBeOnTheScreen();
		expect(screen.getByLabelText(label)).toBeOnTheScreen();
		expect(screen.queryByText(label)).not.toBeOnTheScreen();
		expect(onPress).not.toHaveBeenCalled();
	});

	it("a disabled button ignores presses", async () => {
		const onPress = createPressHandler();
		render(
			<PrimaryButton
				label={faker.lorem.word()}
				onPress={onPress}
				testID="button"
				disabled
			/>,
		);

		await userEvent.press(screen.getByTestId("button"));

		expect(onPress).not.toHaveBeenCalled();
	});
});

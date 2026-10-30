/**
 * A press handler a test can read: `toHaveBeenCalledTimes` says how often
 * the button ran its action. A fresh one per test.
 */
export function createPressHandler(): jest.Mock<void, []> {
	return jest.fn();
}

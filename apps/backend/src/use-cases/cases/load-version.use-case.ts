import { defineUseCase } from "@/use-cases";

export type TVersion = {
	service: string;
	version: string;
	commit: string;
	environment: string;
};

/** What is running: the build the image was made from, and where. */
export const loadVersionUseCase = defineUseCase<void, TVersion>(
	async function loadVersionUseCase(ctx) {
		const { service, version, commit, environment } = ctx.config;
		return { service, version, commit, environment };
	},
);

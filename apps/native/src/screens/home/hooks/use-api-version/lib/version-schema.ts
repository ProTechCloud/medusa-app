import { z } from "zod";

/** The part of the API's `GET /version` answer the home screen shows. */
export const versionSchema = z.object({
	service: z.string(),
	version: z.string(),
	commit: z.string(),
	environment: z.string(),
});

export type TApiVersion = z.infer<typeof versionSchema>;

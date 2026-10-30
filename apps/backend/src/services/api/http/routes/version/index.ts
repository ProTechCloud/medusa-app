import { Hono } from "hono";
import { loadVersionUseCase } from "@/use-cases/cases/load-version.use-case";

/** `GET /version`: the build that is running. The deploy reads `commit` from it. */
export function createVersionRoutes(): Hono {
	return new Hono().get("/", async (context) =>
		context.json({ message: "Hello World", ...(await loadVersionUseCase()) }),
	);
}

import { resolve } from "node:path";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";

const rootDir = resolve(import.meta.dirname, "..");

/**
 * Every file in schema/, merged into one document: the API's type
 * definitions. Each area's file extends the roots in base.graphql.
 */
export const typeDefs = mergeTypeDefs(
	loadFilesSync(resolve(rootDir, "schema"), { extensions: ["graphql"] }),
);

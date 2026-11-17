import { once } from "node:events";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { faker } from "@faker-js/faker";

export type TMailgunRequest = {
	method?: string;
	url?: string;
	auth?: string;
	body: string;
};

export interface IMockMailgunServer {
	/** The base URL to pass as `apiUrl`. */
	readonly url: string;
	/** Every request it received, oldest first. */
	readonly received: TMailgunRequest[];
	close(): Promise<void>;
}

/**
 * A stand-in for Mailgun's HTTP API on a free local port. It answers every
 * request with `status`, or, with `status` null, never answers, as a stalled
 * connection would.
 */
export async function startMockMailgunServer(
	status: number | null,
): Promise<IMockMailgunServer> {
	const received: TMailgunRequest[] = [];
	const server: Server = createServer(async (request, response) => {
		let body = "";
		for await (const chunk of request) body += chunk;
		received.push({
			method: request.method,
			url: request.url,
			auth: request.headers.authorization,
			body,
		});
		if (status !== null) {
			response.writeHead(status).end(faker.lorem.sentence());
		}
	});
	server.listen(0, "127.0.0.1");
	await once(server, "listening");
	const { port } = server.address() as AddressInfo;
	return {
		url: `http://127.0.0.1:${port}`,
		received,
		async close() {
			server.closeAllConnections();
			server.close();
			await once(server, "close");
		},
	};
}

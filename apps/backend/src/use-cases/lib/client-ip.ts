/**
 * The client's address, from `X-Forwarded-For`: each proxy appends the
 * address it received the request from, so with `trustedProxies` of them in
 * front, the client is the entry just before their last `trustedProxies`.
 * Anything earlier came from the client and could be forged. Null when the
 * header is missing or shorter than that, as on a request that bypassed the
 * proxies, such as one to localhost.
 */
export function clientIp(
	headers: Headers,
	trustedProxies: number,
): string | null {
	const entries = (headers.get("x-forwarded-for") ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
	return entries.at(-(trustedProxies + 1)) ?? null;
}

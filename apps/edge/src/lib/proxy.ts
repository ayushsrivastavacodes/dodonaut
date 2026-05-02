/**
 * Proxy a successfully-paid request to the merchant's upstream URL.
 * Forwards method, headers (filtered), body. Returns the upstream response.
 */
import type { Context } from "hono";

const FORWARDABLE_HEADER_PREFIXES = ["x-", "accept", "content-"];
const STRIPPED_HEADERS = new Set([
  "host",
  "connection",
  "x-payment", // already-validated x402 header — don't leak to upstream
  "x-payment-response",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
]);

function forwardableHeaders(src: Headers): Headers {
  const out = new Headers();
  for (const [k, v] of src) {
    const lower = k.toLowerCase();
    if (STRIPPED_HEADERS.has(lower)) continue;
    if (FORWARDABLE_HEADER_PREFIXES.some((p) => lower.startsWith(p))) {
      out.set(k, v);
    }
  }
  return out;
}

export async function proxyToUpstream(
  c: Context,
  upstreamUrl: string,
): Promise<Response> {
  const method = c.req.method;
  const headers = forwardableHeaders(c.req.raw.headers);
  // Tag the upstream call so the merchant can see Dodonaut in their logs.
  headers.set("x-via", "dodonaut");

  const body =
    method === "GET" || method === "HEAD"
      ? undefined
      : await c.req.arrayBuffer();

  const upstreamRes = await fetch(upstreamUrl, {
    method,
    headers,
    body,
  });

  // Strip the `x-payment-response` header from upstream output if it accidentally
  // carries one — this header is reserved for the facilitator-issued settlement proof
  // that the agent receives on the SAME response. Hono's middleware will set it.
  const outHeaders = new Headers(upstreamRes.headers);
  outHeaders.delete("x-payment-response");

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: outHeaders,
  });
}

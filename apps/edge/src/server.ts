/**
 * Dodonaut Edge — x402 paywall in front of merchant upstream URLs.
 *
 * Routing:
 *   GET/POST /m/:merchantSlug/p/:productId
 *     → returns 402 with USDG (primary) and USDC (fallback) accepts blocks
 *     → on settled payment, proxies the agent's request to merchant.endpoints.upstreamUrl
 *
 * Day 4 milestone: returns 402 → signed devnet payment → 200 with proxied body.
 *
 * NOTE: this is the Day 1 skeleton. The actual @x402/hono middleware wiring
 * lands Day 4 once devnet facilitator is verified.
 */
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

const app = new Hono();

app.use("*", logger());
app.use("*", cors({ origin: "*" }));

app.get("/healthz", (c) =>
  c.json({
    ok: true,
    service: "dodonaut-edge",
    version: "0.0.0",
    network: process.env.SOLANA_NETWORK ?? "devnet",
    timestamp: new Date().toISOString(),
  }),
);

app.get("/m/:merchantSlug/p/:productId", async (c) => {
  const merchantSlug = c.req.param("merchantSlug");
  const productId = c.req.param("productId");
  // Day 1 placeholder — Day 4 wires @x402/hono paymentMiddleware here.
  return c.json(
    {
      service: "dodonaut-edge",
      message: "x402 paywall not yet wired",
      merchant: merchantSlug,
      product: productId,
      planned_response: "402 Payment Required (Day 4)",
    },
    501,
  );
});

const port = Number(process.env.PORT ?? 4021);
console.log(`Dodonaut edge listening on :${port}`);
export default { fetch: app.fetch, port };

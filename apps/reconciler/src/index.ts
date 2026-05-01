/**
 * Dodonaut Reconciler — Helius webhook receiver + 10s poller + Dodo Usage Event ingestion.
 *
 * Hosting: Fly.io always-on Bun process (256MB machine).
 * Public URL: https://dodonaut-reconciler.fly.dev
 *
 * Endpoints:
 *   POST /api/webhooks/helius   — Helius enhanced webhook receiver (auth: HELIUS_WEBHOOK_SECRET in Authorization header)
 *   GET  /healthz                — liveness probe for Fly + warmer cron
 *
 * Background loop:
 *   every 10s — poll all known merchant ATAs via getSignaturesForAddress, ingest any signature not yet in on_chain_receipts
 *
 * Day 5 milestone: devnet end-to-end (webhook → match → ingestSettlement → Dodo dashboard usage event).
 */
import { Hono } from "hono";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", logger());

app.get("/healthz", (c) =>
  c.json({
    ok: true,
    service: "dodonaut-reconciler",
    version: "0.0.0",
    network: process.env.SOLANA_NETWORK ?? "devnet",
    timestamp: new Date().toISOString(),
  }),
);

app.post("/api/webhooks/helius", async (c) => {
  const auth = c.req.header("authorization");
  if (auth !== process.env.HELIUS_WEBHOOK_SECRET) {
    return c.text("unauthorized", 401);
  }
  const events = await c.req.json();
  // Day 5 wires the actual settlement ingestion here.
  console.log("helius webhook received", { count: Array.isArray(events) ? events.length : 1 });
  return c.json({ ok: true });
});

const port = Number(process.env.PORT ?? 8080);
console.log(`Dodonaut reconciler listening on :${port}`);
export default { fetch: app.fetch, port };

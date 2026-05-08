/**
 * Dodonaut Reconciler — Helius webhook receiver + 10s poller + Dodo Usage Event ingestion.
 *
 * Public URL (production): https://dodonaut-reconciler.fly.dev
 *
 * Endpoints:
 *   POST /api/webhooks/helius   — Helius enhanced webhook receiver
 *   GET  /healthz                — liveness probe
 *
 * Background:
 *   every 10s — poll all known merchant addresses via helius.enhanced
 *               .getTransactionsByAddress(); reconcile any signatures
 *               not yet in `on_chain_receipts`.
 */
import { Hono } from "hono";
import { logger } from "hono/logger";
import { merchants } from "@dodonaut/db/schema";
import { getDb } from "@dodonaut/db/client";
import {
  parseEnhancedEvents,
  type HeliusEnhancedEvent,
} from "./lib/parse-helius";
import { reconcileCandidate } from "./lib/reconcile";
import { startPoller } from "./lib/poller";

const app = new Hono();

app.use("*", logger());

app.get("/healthz", (c) =>
  c.json({
    ok: true,
    service: "dodonaut-reconciler",
    version: "0.1.0",
    network: process.env.SOLANA_NETWORK ?? "devnet",
    pollerRunning: pollerRunning,
    timestamp: new Date().toISOString(),
  }),
);

app.post("/api/webhooks/helius", async (c) => {
  const auth = c.req.header("authorization");
  if (!process.env.HELIUS_WEBHOOK_SECRET) {
    return c.text("server misconfigured (no secret)", 500);
  }
  if (auth !== process.env.HELIUS_WEBHOOK_SECRET) {
    return c.text("unauthorized", 401);
  }

  const body = (await c.req.json()) as HeliusEnhancedEvent[];
  if (!Array.isArray(body) || body.length === 0) {
    return c.json({ ok: true, processed: 0 });
  }

  const db = getDb();
  const addrs = await db
    .select({ addr: merchants.solanaAddress })
    .from(merchants);
  const knownSet = new Set(addrs.map((r) => r.addr));

  const candidates = parseEnhancedEvents(body, knownSet);
  let processed = 0;
  let ingested = 0;
  for (const cand of candidates) {
    try {
      const r = await reconcileCandidate(cand);
      processed++;
      if (r.status === "ingested" || r.status === "enriched_existing") {
        ingested++;
        console.log(
          `[reconciler.webhook] ${r.status} sig=${cand.signature.slice(0, 8)}…`,
        );
      } else {
        console.log(
          `[reconciler.webhook] ${r.status} sig=${cand.signature.slice(0, 8)}…`,
        );
      }
    } catch (err) {
      console.error("[reconciler.webhook] reconcile failed", err);
    }
  }

  return c.json({
    ok: true,
    received: body.length,
    candidates: candidates.length,
    processed,
    ingested,
  });
});

let pollerRunning = false;
if (process.env.HELIUS_API_KEY) {
  startPoller({
    onTick: (s) => {
      pollerRunning = true;
      if (s.processed > 0) {
        console.log(
          `[reconciler.poll] tick addrs=${s.addresses} processed=${s.processed}`,
        );
      }
    },
  });
} else {
  console.warn(
    "[reconciler] HELIUS_API_KEY not set — poller disabled. Webhook receiver is up but won't have a working backfill.",
  );
}

const port = Number(process.env.PORT ?? 8080);
console.log(
  `Dodonaut reconciler listening on :${port} | network=${process.env.SOLANA_NETWORK ?? "devnet"} | poller=${process.env.HELIUS_API_KEY ? "enabled" : "DISABLED"}`,
);
export default { fetch: app.fetch, port };

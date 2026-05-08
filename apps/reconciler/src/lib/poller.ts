/**
 * Belt-and-braces poller.
 *
 * Every POLL_INTERVAL_MS, fetch recent enhanced transactions for every known
 * merchant Solana address via Helius's `enhanced.getTransactionsByAddress`.
 * Any new signatures get reconciled.
 *
 * This guards against missed Helius webhooks (rare but possible). Reconcile
 * is idempotent on signature so polling never double-bills.
 */
import { getDb } from "@dodonaut/db/client";
import { merchants, onChainReceipts } from "@dodonaut/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getHelius } from "./helius-api";
import {
  parseEnhancedEvents,
  type HeliusEnhancedEvent,
} from "./parse-helius";
import { reconcileCandidate } from "./reconcile";

const POLL_INTERVAL_MS = 10_000;
const MAX_LOOKBACK = 25; // signatures per address per tick

export function startPoller(opts: {
  onTick?: (summary: { addresses: number; processed: number }) => void;
} = {}) {
  let stopped = false;

  async function tick() {
    if (stopped) return;
    try {
      const summary = await pollOnce();
      opts.onTick?.(summary);
    } catch (err) {
      console.error("[reconciler.poll] tick failed", err);
    } finally {
      if (!stopped) setTimeout(tick, POLL_INTERVAL_MS);
    }
  }
  setTimeout(tick, POLL_INTERVAL_MS);
  return () => {
    stopped = true;
  };
}

async function pollOnce(): Promise<{
  addresses: number;
  processed: number;
}> {
  const db = getDb();
  const addrs = await db
    .select({ addr: merchants.solanaAddress })
    .from(merchants);
  const knownSet = new Set(addrs.map((r) => r.addr));
  if (knownSet.size === 0) return { addresses: 0, processed: 0 };

  const helius = getHelius();
  let processed = 0;

  for (const addr of knownSet) {
    let recent: unknown[];
    try {
      recent = await helius.enhanced.getTransactionsByAddress({
        address: addr,
        commitment: "confirmed",
      });
    } catch (err) {
      console.warn(`[reconciler.poll] getTransactionsByAddress(${addr})`, err);
      continue;
    }
    const events = (recent as HeliusEnhancedEvent[]).slice(0, MAX_LOOKBACK);
    if (events.length === 0) continue;

    // Filter out signatures we've already seen.
    const sigs = events.map((e) => e.signature).filter(Boolean);
    const seen = await db
      .select({ s: onChainReceipts.signature })
      .from(onChainReceipts)
      .where(inArray(onChainReceipts.signature, sigs));
    const seenSet = new Set(seen.map((r) => r.s));
    const fresh = events.filter(
      (e) => !!e.signature && !seenSet.has(e.signature),
    );

    if (fresh.length === 0) continue;
    const candidates = parseEnhancedEvents(fresh, knownSet);
    for (const c of candidates) {
      try {
        const r = await reconcileCandidate(c);
        processed++;
        if (r.status === "ingested" || r.status === "enriched_existing") {
          console.log(
            `[reconciler.poll] ${r.status} sig=${c.signature.slice(0, 8)}…`,
          );
        }
      } catch (err) {
        console.error(`[reconciler.poll] reconcile ${c.signature}`, err);
      }
    }
  }
  return { addresses: knownSet.size, processed };
}

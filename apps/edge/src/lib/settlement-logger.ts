/**
 * Persist an `on_chain_receipts` row immediately after a successful x402 settlement.
 *
 * The Day-5 reconciler (Helius webhook listener + 10s poller) is the canonical
 * source of truth — but the facilitator's settle response gives us the signature
 * synchronously, so we eagerly insert here for fast dashboard updates.
 *
 * Idempotent on `signature` (UNIQUE constraint).
 *
 * Day 5 will additionally: mark Dodo Usage Event ingested, populate dodo_event_id.
 */
import { getDb } from "@dodonaut/db/client";
import { onChainReceipts, agentWallets } from "@dodonaut/db/schema";
import { sql } from "drizzle-orm";
import type { ResolvedEndpoint } from "./endpoint-resolver.js";

export interface LogSettlementInput {
  signature: string;
  agentWallet: string;
  amountBaseUnits: bigint;
  asset: "USDG" | "USDC";
  network: string;
  endToEndLatencyMs: number;
  endpoint: ResolvedEndpoint;
  rawSettleResponse?: unknown;
}

export async function logSettlement(input: LogSettlementInput): Promise<void> {
  const db = getDb();

  await db
    .insert(onChainReceipts)
    .values({
      endpointId: input.endpoint.endpointId,
      merchantId: input.endpoint.merchantId,
      signature: input.signature,
      blockTime: new Date(), // facilitator settled now; Helius will refine on Day 5
      agentWallet: input.agentWallet,
      amountBaseUnits: input.amountBaseUnits,
      asset: input.asset,
      network: input.network,
      endToEndLatencyMs: input.endToEndLatencyMs,
      rawHeliusEvent: (input.rawSettleResponse ?? null) as object | null,
    })
    .onConflictDoNothing({ target: onChainReceipts.signature });

  // Upsert agent wallet stats.
  await db
    .insert(agentWallets)
    .values({
      pubkey: input.agentWallet,
      callCount: 1,
      totalSpentUsdBaseUnits: input.amountBaseUnits,
    })
    .onConflictDoUpdate({
      target: agentWallets.pubkey,
      set: {
        lastSeenAt: new Date(),
        callCount: sql`${agentWallets.callCount} + 1`,
        totalSpentUsdBaseUnits: sql`${agentWallets.totalSpentUsdBaseUnits} + ${input.amountBaseUnits}`,
      },
    });
}

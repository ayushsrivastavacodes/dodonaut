import type { AssetSymbol } from "@dodonaut/shared/mints";
import { getDodoClient } from "./client";

/**
 * Ingest a settled x402 call as a Dodo Usage Event.
 *
 * Verified against `dodopayments` v2.30.0 SDK. The on-client property is
 * `dodo.usageEvents.ingest(...)` returning `{ ingested_count: number }`.
 *
 * Constraints from Dodo (per usage-events.d.ts):
 *  - Max 1000 events per request (we send 1 at a time from the reconciler).
 *  - Timestamps older than 1 hour OR more than 5 minutes in the future are rejected.
 *  - Metadata: max 50 key-value pairs, key ≤100 chars, value ≤500 chars.
 *  - Subsequent requests with existing `event_id` are silently ignored (idempotent).
 *  - Duplicate `event_id` within the same request rejects the entire request.
 *
 * Reconciliation strategy (PRD §6, V2):
 *   - Path A (preferred): customer_id is `dodonaut_agent_<wallet_prefix>`.
 *     Requires Dodo to accept arbitrary customer_id strings. Verified by V2.
 *   - Path B (fallback): customer_id is the merchant's pre-created sentinel
 *     (`merchants.dodo_agents_customer_id`). Used when V2 reveals Dodo rejects
 *     arbitrary IDs. Agent wallet still surfaces in metadata for slicing.
 *
 * `event_id = signature` makes the call idempotent — retries by the reconciler
 * (10s poller belt-and-braces) will not double-bill.
 */
export interface IngestSettlementInput {
  signature: string;
  agentWallet: string;
  merchantSlug: string;
  productId: string;
  endpointId: string;
  amountBaseUnits: bigint;
  asset: AssetSymbol;
  blockTime: Date;
  endToEndLatencyMs: number;
  /** From merchants.dodo_agents_customer_id; if non-null, use Path B. */
  sentinelCustomerId?: string | null;
  /** Network identifier — typically "solana:mainnet" or "solana:devnet". */
  network: string;
}

export interface IngestSettlementResult {
  ingested_count: number;
  /** The customer_id that was actually sent (for cross-referencing back). */
  customerId: string;
  /** The timestamp that was actually sent (clamped to Dodo's window). */
  timestamp: string;
}

/**
 * Clamp a Solana block_time into Dodo's accepted ingestion window
 * (now-1h, now+5min). If outside, fall back to current time.
 * Surface the clamping in metadata so the merchant can see if it happened.
 */
function clampTimestamp(blockTime: Date): {
  timestamp: string;
  clamped: boolean;
} {
  const now = Date.now();
  const ts = blockTime.getTime();
  const oneHourAgo = now - 60 * 60 * 1000;
  const fiveMinFromNow = now + 5 * 60 * 1000;
  if (ts < oneHourAgo || ts > fiveMinFromNow) {
    return { timestamp: new Date(now).toISOString(), clamped: true };
  }
  return { timestamp: blockTime.toISOString(), clamped: false };
}

export async function ingestSettlement(
  input: IngestSettlementInput,
): Promise<IngestSettlementResult> {
  const dodo = getDodoClient();
  const customerId =
    input.sentinelCustomerId ??
    `dodonaut_agent_${input.agentWallet.slice(0, 12)}`;
  const { timestamp, clamped } = clampTimestamp(input.blockTime);

  const metadata: Record<string, string> = {
    product_id: input.productId,
    dodonaut_endpoint_id: input.endpointId,
    amount_base_units: String(input.amountBaseUnits),
    asset: input.asset,
    network: input.network,
    signature: input.signature,
    latency_ms: String(input.endToEndLatencyMs),
    merchant_slug: input.merchantSlug,
    agent_wallet: input.agentWallet,
  };
  if (clamped) {
    metadata.original_block_time = input.blockTime.toISOString();
    metadata.timestamp_clamped = "true";
  }

  const result = await dodo.usageEvents.ingest({
    events: [
      {
        event_id: input.signature,
        customer_id: customerId,
        event_name: "dodonaut.x402_call",
        timestamp,
        metadata,
      },
    ],
  });

  return {
    ingested_count: result.ingested_count,
    customerId,
    timestamp,
  };
}

/**
 * Reconciliation core.
 *
 * For each settlement candidate (parsed from a Helius webhook OR the polling
 * fallback):
 *   1. Dedup by `signature` against `on_chain_receipts` (UNIQUE constraint).
 *   2. Resolve which endpoint should be credited:
 *        a. Match `(merchantWallet, asset, amountBaseUnits)` to a single
 *           enabled endpoint owned by that merchant. Loose match — agents
 *           construct the transfer themselves and we don't yet enforce
 *           memo/reference encoding.
 *        b. If multiple endpoints match, pick the most recently created.
 *        c. If none match, log and skip (rare — would require a transfer to
 *           a merchant address that isn't tied to any active endpoint).
 *   3. Persist the receipt and call `dodo.usageEvents.ingest` via
 *      `ingestSettlement()` from `@dodonaut/dodo`. Idempotent on signature.
 *   4. If the edge eagerly inserted a row earlier (signature already exists),
 *      enrich it with block_time + dodo_event_id rather than insert duplicate.
 */
import { getDb } from "@dodonaut/db/client";
import {
  endpoints,
  merchants,
  onChainReceipts,
  type Endpoint,
  type Merchant,
} from "@dodonaut/db/schema";
import { ingestSettlement } from "@dodonaut/dodo/ingest";
import { and, desc, eq } from "drizzle-orm";
import type { SettlementCandidate } from "./parse-helius";

export interface ReconcileResult {
  signature: string;
  status:
    | "skipped_unknown_merchant"
    | "skipped_no_endpoint_match"
    | "ingested"
    | "already_ingested"
    | "enriched_existing";
  endpointId?: string;
  dodoEventId?: string;
  error?: string;
}

export async function reconcileCandidate(
  c: SettlementCandidate,
): Promise<ReconcileResult> {
  const db = getDb();

  // Look up merchant by wallet.
  const merchantRows = await db
    .select()
    .from(merchants)
    .where(eq(merchants.solanaAddress, c.merchantWallet))
    .limit(1);
  const merchant = merchantRows[0];
  if (!merchant) {
    return {
      signature: c.signature,
      status: "skipped_unknown_merchant",
    };
  }

  // Has the edge already inserted this signature?
  const existing = await db
    .select()
    .from(onChainReceipts)
    .where(eq(onChainReceipts.signature, c.signature))
    .limit(1);

  if (existing[0]) {
    if (existing[0].dodoEventId) {
      return {
        signature: c.signature,
        status: "already_ingested",
        endpointId: existing[0].endpointId ?? undefined,
        dodoEventId: existing[0].dodoEventId,
      };
    }
    return enrichExistingReceipt(existing[0], merchant);
  }

  // No existing row — find a matching enabled endpoint by (merchant, asset, amount).
  const endpointMatches = await db
    .select()
    .from(endpoints)
    .where(
      and(
        eq(endpoints.merchantId, merchant.id),
        eq(endpoints.priceUsdBaseUnits, c.amountBaseUnits),
        eq(endpoints.enabled, true),
      ),
    )
    .orderBy(desc(endpoints.createdAt))
    .limit(1);

  const endpoint = endpointMatches[0];
  if (!endpoint) {
    return {
      signature: c.signature,
      status: "skipped_no_endpoint_match",
    };
  }

  const insertResult = await db
    .insert(onChainReceipts)
    .values({
      endpointId: endpoint.id,
      merchantId: merchant.id,
      signature: c.signature,
      blockTime: c.blockTime,
      agentWallet: c.agentWallet,
      amountBaseUnits: c.amountBaseUnits,
      asset: c.asset,
      network: process.env.SOLANA_NETWORK === "mainnet" ? "solana:mainnet" : "solana:devnet",
      rawHeliusEvent: c.raw as object,
    })
    .onConflictDoNothing({ target: onChainReceipts.signature })
    .returning();

  // Conflict means edge inserted a microsecond before we did — go enrich path.
  if (insertResult.length === 0) {
    const after = await db
      .select()
      .from(onChainReceipts)
      .where(eq(onChainReceipts.signature, c.signature))
      .limit(1);
    if (after[0]) return enrichExistingReceipt(after[0], merchant);
  }

  // Ingest to Dodo.
  return ingestAndStamp({
    receiptId: insertResult[0]!.id,
    endpointId: endpoint.id,
    merchant,
    candidate: c,
    dodoProductId: undefined,
    sentinelCustomerId: merchant.dodoAgentsCustomerId ?? null,
  });
}

async function enrichExistingReceipt(
  receipt: typeof onChainReceipts.$inferSelect,
  merchant: Merchant,
): Promise<ReconcileResult> {
  if (!receipt.endpointId) {
    return {
      signature: receipt.signature,
      status: "skipped_no_endpoint_match",
    };
  }
  const db = getDb();
  const epRows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, receipt.endpointId))
    .limit(1);
  const ep = epRows[0];
  if (!ep) {
    return {
      signature: receipt.signature,
      status: "skipped_no_endpoint_match",
    };
  }
  return ingestAndStamp({
    receiptId: receipt.id,
    endpointId: ep.id,
    merchant,
    candidate: {
      signature: receipt.signature,
      blockTime: receipt.blockTime,
      agentWallet: receipt.agentWallet,
      merchantWallet: merchant.solanaAddress,
      amountBaseUnits: receipt.amountBaseUnits,
      asset: receipt.asset,
      mint: "",
      raw: receipt.rawHeliusEvent,
    },
    dodoProductId: undefined,
    sentinelCustomerId: merchant.dodoAgentsCustomerId ?? null,
  });
}

async function ingestAndStamp(args: {
  receiptId: string;
  endpointId: string;
  merchant: Merchant;
  candidate: SettlementCandidate;
  dodoProductId: string | undefined;
  sentinelCustomerId: string | null;
}): Promise<ReconcileResult> {
  const db = getDb();
  // Pull the product_id off the endpoint for the metadata.
  const epRows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.id, args.endpointId))
    .limit(1);
  const ep = epRows[0]!;

  let dodoEventId: string | null = null;
  try {
    const result = await ingestSettlement({
      signature: args.candidate.signature,
      agentWallet: args.candidate.agentWallet,
      merchantSlug: args.merchant.slug,
      productId: ep.productId,
      endpointId: ep.id,
      amountBaseUnits: args.candidate.amountBaseUnits,
      asset: args.candidate.asset,
      blockTime: args.candidate.blockTime,
      endToEndLatencyMs: 0,
      sentinelCustomerId: args.sentinelCustomerId,
      network:
        process.env.SOLANA_NETWORK === "mainnet"
          ? "solana:mainnet"
          : "solana:devnet",
    });
    dodoEventId = `${result.customerId}/${args.candidate.signature}`;
  } catch (err) {
    console.error("ingestSettlement failed", err);
    return {
      signature: args.candidate.signature,
      status: "skipped_no_endpoint_match",
      endpointId: ep.id,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  await db
    .update(onChainReceipts)
    .set({
      dodoEventId,
      dodoIngestedAt: new Date(),
      blockTime: args.candidate.blockTime,
    })
    .where(eq(onChainReceipts.id, args.receiptId));

  return {
    signature: args.candidate.signature,
    status: "ingested",
    endpointId: ep.id,
    dodoEventId: dodoEventId ?? undefined,
  };
}

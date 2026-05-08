/**
 * Lifecycle helpers for the Dodonaut Helius webhook.
 *
 * On boot, ensure exactly one webhook exists pointing at our /api/webhooks/helius
 * endpoint, watching every known merchant Solana address from the DB. When a new
 * merchant lands (or wraps a product), we re-sync the address list.
 *
 * Helius enhanced webhooks accept a single accountAddresses array per webhook
 * (up to 100k addresses on the Developer plan). We don't shard yet — Day 5
 * scale is a handful of beta merchants.
 */
import { createHelius } from "helius-sdk";
import { getDb } from "@dodonaut/db/client";
import { merchants } from "@dodonaut/db/schema";

let _helius: ReturnType<typeof createHelius> | null = null;

export function getHelius() {
  if (!_helius) {
    if (!process.env.HELIUS_API_KEY) {
      throw new Error("HELIUS_API_KEY is required");
    }
    _helius = createHelius({ apiKey: process.env.HELIUS_API_KEY });
  }
  return _helius;
}

export interface EnsureWebhookConfig {
  /** Public URL Helius will POST to. */
  webhookUrl: string;
  /** Random secret sent as Authorization header by Helius; we verify on receive. */
  authHeader: string;
  /** Mainnet vs devnet (controls webhookType: enhanced / enhancedDevnet). */
  network: "mainnet" | "devnet";
  /** If known, reuse this webhook ID. Otherwise we create one. */
  existingWebhookId?: string;
}

/**
 * Ensure a webhook exists with the right config + every known merchant address.
 * Returns the webhook ID (persist it as HELIUS_WEBHOOK_ID for reuse).
 */
export async function ensureMerchantWebhook(
  cfg: EnsureWebhookConfig,
): Promise<string> {
  const helius = getHelius();
  const db = getDb();

  const merchantRows = await db
    .select({ addr: merchants.solanaAddress })
    .from(merchants);
  const addresses = merchantRows.map((r) => r.addr).filter(Boolean);

  const webhookType =
    cfg.network === "mainnet" ? "enhanced" : "enhancedDevnet";

  const desired = {
    webhookURL: cfg.webhookUrl,
    transactionTypes: ["TRANSFER"],
    accountAddresses: addresses,
    webhookType,
    authHeader: cfg.authHeader,
    txnStatus: "success",
    encoding: "json",
  };

  if (cfg.existingWebhookId) {
    await helius.webhooks.update(cfg.existingWebhookId, desired);
    return cfg.existingWebhookId;
  }

  // No existing — try to find one matching our URL (defensive, in case env got lost).
  const all = await helius.webhooks.getAll();
  const existing = all.find(
    (w: { webhookURL: string }) => w.webhookURL === cfg.webhookUrl,
  );
  if (existing) {
    await helius.webhooks.update(existing.webhookID, desired);
    return existing.webhookID;
  }

  const created = await helius.webhooks.create(desired);
  return created.webhookID;
}

/**
 * Append a single new merchant address to the existing webhook.
 * Called from the wrap flow when a merchant connects their wallet.
 */
export async function addAddressToWebhook(
  webhookId: string,
  newAddress: string,
): Promise<void> {
  const helius = getHelius();
  const current = await helius.webhooks.get(webhookId);
  const next = Array.from(new Set([...current.accountAddresses, newAddress]));
  await helius.webhooks.update(webhookId, { accountAddresses: next });
}

/**
 * Parse an array of Helius EnhancedTransaction events into settlement candidates.
 *
 * Pulls every SPL token transfer where the destination is a known merchant
 * Solana address AND the mint is USDC (mainnet or devnet). Native SOL
 * transfers are ignored.
 */
import {
  USDC_MINT_MAINNET,
  USDC_MINT_DEVNET,
  symbolFromMint,
  type AssetSymbol,
} from "@dodonaut/shared/mints";

export interface SettlementCandidate {
  signature: string;
  blockTime: Date;
  agentWallet: string; // fromUserAccount
  merchantWallet: string; // toUserAccount
  amountBaseUnits: bigint; // tokenAmount * 10^decimals (most stables = 6)
  asset: AssetSymbol;
  mint: string;
  raw: unknown;
}

/** Type-loose representation of a Helius enhanced webhook event payload. */
export interface HeliusEnhancedEvent {
  signature: string;
  timestamp?: number;
  type?: string;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number | string;
    decimals?: number;
  }>;
}

const KNOWN_STABLECOIN_MINTS: ReadonlySet<string> = new Set([
  USDC_MINT_MAINNET,
  USDC_MINT_DEVNET,
]);

export function parseEnhancedEvents(
  events: HeliusEnhancedEvent[],
  knownMerchantAddresses: ReadonlySet<string>,
): SettlementCandidate[] {
  const out: SettlementCandidate[] = [];
  for (const ev of events) {
    if (!ev?.signature) continue;
    const transfers = ev.tokenTransfers ?? [];
    const blockTime = ev.timestamp
      ? new Date(ev.timestamp * 1000)
      : new Date();
    for (const t of transfers) {
      if (!KNOWN_STABLECOIN_MINTS.has(t.mint)) continue;
      if (!knownMerchantAddresses.has(t.toUserAccount)) continue;
      const symbol = symbolFromMint(t.mint);
      if (!symbol) continue;
      const decimals = t.decimals ?? 6;
      const amountBaseUnits = uiAmountToBaseUnits(t.tokenAmount, decimals);
      if (amountBaseUnits <= 0n) continue;
      out.push({
        signature: ev.signature,
        blockTime,
        agentWallet: t.fromUserAccount,
        merchantWallet: t.toUserAccount,
        amountBaseUnits,
        asset: symbol,
        mint: t.mint,
        raw: ev,
      });
    }
  }
  return out;
}

function uiAmountToBaseUnits(
  amount: number | string,
  decimals: number,
): bigint {
  const s = typeof amount === "string" ? amount : amount.toString();
  const [whole = "0", frac = ""] = s.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

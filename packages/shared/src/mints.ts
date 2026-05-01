/**
 * Solana SPL token mints used by Dodonaut.
 *
 * USDG is the featured settlement asset (PRD §10.1, §2.3 — Paxos Global Dollar,
 * $1B+ supply on Solana, prize denomination). USDC is the fallback for agent
 * wallets that don't hold USDG.
 */

export const USDG_MINT_MAINNET = "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH";
export const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export const TOKEN_DECIMALS = 6;

export type AssetSymbol = "USDG" | "USDC";

export const MINT_BY_SYMBOL_MAINNET: Record<AssetSymbol, string> = {
  USDG: USDG_MINT_MAINNET,
  USDC: USDC_MINT_MAINNET,
};

export function symbolFromMint(mint: string): AssetSymbol | null {
  if (mint === USDG_MINT_MAINNET) return "USDG";
  if (mint === USDC_MINT_MAINNET) return "USDC";
  if (mint === USDC_MINT_DEVNET) return "USDC";
  return null;
}

/**
 * Convert a base-units bigint (6-decimal smallest unit) to a USD-equivalent
 * decimal string. USDG and USDC are both 1:1 with USD by design.
 */
export function baseUnitsToUsdString(baseUnits: bigint): string {
  const whole = baseUnits / 1_000_000n;
  const frac = baseUnits % 1_000_000n;
  return `${whole}.${frac.toString().padStart(6, "0")}`;
}

/**
 * Convert a USD decimal string to base units. "0.05" -> 50000n.
 */
export function usdStringToBaseUnits(usd: string): bigint {
  const [whole = "0", frac = ""] = usd.split(".");
  const fracPadded = (frac + "000000").slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(fracPadded);
}

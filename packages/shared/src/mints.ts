/**
 * Solana SPL token mints used by Dodonaut.
 *
 * USDC only. Per the x402 docs (quickstart-for-sellers), `ExactSvmScheme`
 * natively converts USD-denominated Money strings (`"$0.05"`) into USDC
 * atomic units — no AssetAmount object required, no extra config.
 */

export const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export const TOKEN_DECIMALS = 6;

export type AssetSymbol = "USDC";

export const MINT_BY_SYMBOL_MAINNET: Record<AssetSymbol, string> = {
  USDC: USDC_MINT_MAINNET,
};

export function symbolFromMint(mint: string): AssetSymbol | null {
  if (mint === USDC_MINT_MAINNET) return "USDC";
  if (mint === USDC_MINT_DEVNET) return "USDC";
  return null;
}

/**
 * Convert a base-units bigint (6-decimal smallest unit) to a USD-equivalent
 * decimal string. USDC is 1:1 with USD by design.
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

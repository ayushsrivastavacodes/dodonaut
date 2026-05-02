/**
 * x402 / Solana network identifiers.
 *
 * x402 v2 uses CAIP-2 strings: `solana:<cluster-genesis-hash-prefix>`.
 * The cluster-genesis prefix uniquely identifies the Solana cluster.
 */

/**
 * CAIP-2 strings as template-literal types so they're assignable to
 * @x402/core/types `Network` (which is `\`${string}:${string}\``).
 */
export const SOLANA_MAINNET_CAIP2 =
  "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" as const;
export const SOLANA_DEVNET_CAIP2 =
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" as const;

export type Caip2Network = `${string}:${string}`;
export type SolanaNetwork = "mainnet" | "devnet";

export function caip2For(network: SolanaNetwork): Caip2Network {
  return network === "mainnet" ? SOLANA_MAINNET_CAIP2 : SOLANA_DEVNET_CAIP2;
}

export function rpcDefaultFor(network: SolanaNetwork): string {
  return network === "mainnet"
    ? "https://api.mainnet-beta.solana.com"
    : "https://api.devnet.solana.com";
}

/**
 * Default x402 facilitator URLs.
 * Coinbase CDP for mainnet (1,000 free tx/mo, then $0.001/tx); x402.org default for devnet.
 * Fallback: PayAI (https://facilitator.payai.network) if Coinbase Solana support is thin.
 */
export const FACILITATOR_URL_DEVNET = "https://x402.org/facilitator";
export const FACILITATOR_URL_MAINNET_COINBASE =
  "https://api.cdp.coinbase.com/platform/v2/x402";
export const FACILITATOR_URL_MAINNET_PAYAI = "https://facilitator.payai.network";

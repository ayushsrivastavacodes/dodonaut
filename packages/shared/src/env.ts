/**
 * Zod-validated environment loader.
 *
 * Each app builds its own validated env object from the relevant subset.
 * This prevents typos (DODP_PAYMENTS_API_KEY vs DODO_PAYMENTS_API_KEY)
 * and provides a typed `env.X` everywhere.
 */
import { z } from "zod";

const SolanaNetwork = z.enum(["mainnet", "devnet"]);
const DodoEnvironment = z.enum(["test_mode", "live_mode"]);

export const webEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  DODO_PAYMENTS_API_KEY: z.string().min(1),
  DODO_PAYMENTS_WEBHOOK_SECRET: z.string().min(1),
  DODO_PAYMENTS_ENVIRONMENT: DodoEnvironment.default("test_mode"),
  DODO_PAYMENTS_RETURN_URL: z.string().url().optional(),
  NEXT_PUBLIC_DODONAUT_BASE_URL: z.string().url(),
  NEXT_PUBLIC_DODONAUT_API_BASE: z.string().url(),
  SOLANA_NETWORK: SolanaNetwork.default("devnet"),
  SOLANA_RPC_URL: z.string().url(),
  USDG_MINT_MAINNET: z.string().min(32),
  USDC_MINT_MAINNET: z.string().min(32),
  USDC_MINT_DEVNET: z.string().min(32),
});

export const edgeEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  X402_FACILITATOR_URL: z.string().url(),
  COINBASE_CDP_API_KEY: z.string().optional(),
  COINBASE_CDP_API_SECRET: z.string().optional(),
  SOLANA_NETWORK: SolanaNetwork.default("devnet"),
  SOLANA_RPC_URL: z.string().url(),
  USDG_MINT_MAINNET: z.string().min(32),
  USDC_MINT_MAINNET: z.string().min(32),
  USDC_MINT_DEVNET: z.string().min(32),
  DODONAUT_API_BASE: z.string().url(),
});

export const reconcilerEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  HELIUS_API_KEY: z.string().min(1),
  HELIUS_WEBHOOK_SECRET: z.string().min(16),
  HELIUS_WEBHOOK_ID: z.string().optional(),
  DODO_PAYMENTS_API_KEY: z.string().min(1),
  DODO_PAYMENTS_ENVIRONMENT: DodoEnvironment.default("test_mode"),
  SOLANA_NETWORK: SolanaNetwork.default("devnet"),
  SOLANA_RPC_URL: z.string().url(),
  USDG_MINT_MAINNET: z.string().min(32),
  USDC_MINT_MAINNET: z.string().min(32),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
export type EdgeEnv = z.infer<typeof edgeEnvSchema>;
export type ReconcilerEnv = z.infer<typeof reconcilerEnvSchema>;

export function loadWebEnv(): WebEnv {
  return webEnvSchema.parse(process.env);
}

export function loadEdgeEnv(): EdgeEnv {
  return edgeEnvSchema.parse(process.env);
}

export function loadReconcilerEnv(): ReconcilerEnv {
  return reconcilerEnvSchema.parse(process.env);
}

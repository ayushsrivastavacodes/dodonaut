#!/usr/bin/env bun
/**
 * V1 — Probe the Coinbase CDP x402 facilitator's `/supported` endpoint
 * to confirm Solana mainnet + USDG mint are accepted.
 *
 * Run once you have COINBASE_CDP_API_KEY in your environment:
 *   COINBASE_CDP_API_KEY=... bun scripts/v1-probe-coinbase.ts
 *
 * Pass criterion: response array contains an entry with
 *   { network: "solana:mainnet", scheme: "exact", asset: <USDG_MINT> }
 *
 * If no USDG entry but USDC entry present:
 *   - acceptable for v1 (USDC fallback works); USDG slips to v1.1
 *   - update plan + DM @ayushagarwal noting the constraint
 *
 * If no Solana entries at all:
 *   - fall back to PayAI: https://facilitator.payai.network
 *   - update X402_FACILITATOR_URL and re-probe with same script (different URL)
 */
import { HTTPFacilitatorClient } from "@x402/core/server";
import {
  USDG_MINT_MAINNET,
  USDC_MINT_MAINNET,
} from "@dodonaut/shared/mints";
import {
  SOLANA_MAINNET_CAIP2,
  FACILITATOR_URL_MAINNET_COINBASE,
  FACILITATOR_URL_MAINNET_PAYAI,
} from "@dodonaut/shared/networks";

const facilitatorUrl =
  process.env.X402_FACILITATOR_URL ?? FACILITATOR_URL_MAINNET_COINBASE;
const apiKey = process.env.COINBASE_CDP_API_KEY;

if (!apiKey && facilitatorUrl.includes("cdp.coinbase.com")) {
  console.error("COINBASE_CDP_API_KEY required for Coinbase facilitator probe");
  console.error(
    "Set it or change X402_FACILITATOR_URL to:",
    FACILITATOR_URL_MAINNET_PAYAI,
  );
  process.exit(2);
}

const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined;
const fc = new HTTPFacilitatorClient({ url: facilitatorUrl, headers });

console.log("Probing facilitator:", facilitatorUrl);
const supported = await fc.supported();
console.log("Raw supported response:", JSON.stringify(supported, null, 2));

const entries = Array.isArray(supported)
  ? supported
  : (supported as { kinds?: unknown[] })?.kinds ?? [];

const solanaEntries = (entries as Array<Record<string, unknown>>).filter(
  (e) => typeof e.network === "string" && e.network.startsWith("solana"),
);
console.log(`\nSolana entries found: ${solanaEntries.length}`);
for (const e of solanaEntries) {
  console.log(" -", JSON.stringify(e));
}

const hasUsdg = solanaEntries.some(
  (e) =>
    e.network === SOLANA_MAINNET_CAIP2 &&
    typeof e.asset === "string" &&
    e.asset === USDG_MINT_MAINNET,
);
const hasUsdc = solanaEntries.some(
  (e) =>
    e.network === SOLANA_MAINNET_CAIP2 &&
    typeof e.asset === "string" &&
    e.asset === USDC_MINT_MAINNET,
);

console.log("\n=== V1 Verdict ===");
console.log(`USDG-on-Solana mainnet: ${hasUsdg ? "✅ supported" : "❌ NOT supported"}`);
console.log(`USDC-on-Solana mainnet: ${hasUsdc ? "✅ supported" : "❌ NOT supported"}`);

if (!hasUsdg && !hasUsdc) {
  console.log("\nFallback: re-run with PayAI facilitator:");
  console.log(
    `  X402_FACILITATOR_URL=${FACILITATOR_URL_MAINNET_PAYAI} bun scripts/v1-probe-coinbase.ts`,
  );
  process.exit(1);
}
process.exit(0);

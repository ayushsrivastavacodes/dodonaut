#!/usr/bin/env bun
/**
 * Day-4 verification: simulate an AI agent calling a Dodonaut x402 endpoint.
 *
 * Flow:
 *   1. Generate (or load) a Solana keypair as the "agent wallet"
 *   2. Fund it with devnet USDC via Circle's faucet (do this manually first)
 *   3. wrapFetchWithPayment from @x402/fetch + svm signer from @x402/svm/client
 *   4. Call the wrapped URL → should see 402 → sign + retry → 200 with proxied body
 *
 * Usage:
 *   AGENT_KEYPAIR_FILE=~/.config/solana/id.json \
 *   ENDPOINT_URL=http://localhost:4021/m/<slug>/p/<pdt_id> \
 *     bun apps/edge/scripts/agent-call.ts
 *
 * Pass criterion: <2s end-to-end on devnet, with proxied upstream body printed.
 */
import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { x402Client } from "@x402/core/client";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const endpointUrl = process.env.ENDPOINT_URL;
if (!endpointUrl) {
  console.error(
    "ENDPOINT_URL is required (e.g. http://localhost:4021/m/aman/p/pdt_xxx)",
  );
  process.exit(2);
}

const keypairFile = (
  process.env.AGENT_KEYPAIR_FILE ?? "~/.config/solana/id.json"
).replace("~", os.homedir());

if (!fs.existsSync(keypairFile)) {
  console.error(`Keypair file not found: ${keypairFile}`);
  console.error(
    "Run `solana-keygen new -o ~/.config/solana/id.json` then airdrop devnet SOL+USDC",
  );
  process.exit(2);
}

const secretBytes = new Uint8Array(
  JSON.parse(fs.readFileSync(keypairFile, "utf-8")) as number[],
);
const signer = await createKeyPairSignerFromBytes(secretBytes);

console.log(`Agent wallet:   ${signer.address}`);
console.log(`Calling:        ${endpointUrl}`);

const NETWORK = (process.env.SOLANA_NETWORK ?? "mainnet") as
  | "mainnet"
  | "devnet";
const NETWORK_CAIP2 =
  NETWORK === "mainnet"
    ? "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"
    : "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

console.log(`Network:        ${NETWORK} (${NETWORK_CAIP2})`);

const client = new x402Client();
const scheme = new ExactSvmScheme(signer);
client.register(NETWORK_CAIP2, scheme);

const fetchPaid = wrapFetchWithPayment(fetch, client);

const startedAt = Date.now();
console.log("\n--- Step 1: unsigned probe (expect 402) ---");
const probe = await fetch(endpointUrl);
console.log("Probe status:", probe.status);
if (probe.status === 402) {
  const body = (await probe.json()) as Record<string, unknown>;
  console.log("Probe accepts:", JSON.stringify(body.accepts ?? body, null, 2));
}

console.log("\n--- Step 2: signed call via wrapFetchWithPayment ---");
const res = await fetchPaid(endpointUrl);
const elapsed = Date.now() - startedAt;
console.log(`Final status:    ${res.status}`);
console.log(`Elapsed:         ${elapsed}ms`);

// Surface every header the response includes so we see what the facilitator says
console.log("Response headers:");
for (const [k, v] of res.headers.entries()) {
  console.log(`  ${k}: ${v.length > 1200 ? v.slice(0, 1200) + "…" : v}`);
  if (k === "payment-required") {
    try {
      let s = v; while (s.length % 4) s += "=";
      console.log("    decoded:", Buffer.from(s, "base64").toString("utf-8"));
    } catch (e) { console.log("    decode err", e); }
  }
}

const xpr = res.headers.get("x-payment-response");
if (xpr) {
  try {
    const parsed = JSON.parse(Buffer.from(xpr, "base64").toString("utf-8"));
    console.log("Payment response:", JSON.stringify(parsed, null, 2));
  } catch {
    console.log("x-payment-response (raw):", xpr.slice(0, 100), "…");
  }
}

const text = await res.text();
console.log("Response body:");
console.log(text.length > 500 ? text.slice(0, 500) + "…" : text);

if (res.status === 200) {
  console.log("\n✅ Day-4 verification PASSED");
  process.exit(0);
} else {
  console.error("\n❌ Day-4 verification FAILED — non-200 final status");
  process.exit(1);
}

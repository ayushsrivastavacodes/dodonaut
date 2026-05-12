# Dodonaut

> One-button wrapper that turns any Dodo Payments product into an x402-protected HTTP endpoint AI agents can pay per call in USDC on Solana.

**Solana Frontier hackathon submission · 2026 · solo entry by [@ayushsrivastavacodes](https://github.com/ayushsrivastavacodes)**

[![live demo](https://img.shields.io/badge/live-api.dodonaut.xyz-B45309)](https://api.dodonaut.xyz/healthz)
[![mainnet tx](https://img.shields.io/badge/mainnet%20settlement-Solscan-9945FF)](https://solscan.io/tx/451n3Z57nFu2jPZhRE387ekLSq8cTPf93X4Sqrsn8MQR2Yw6oqFbNRNdKNpMAihtVdNWtdHq7Sgacm8oR6zMHJm9)
[![license](https://img.shields.io/badge/license-MIT-black)](./LICENSE)

---

## What it does

Dodo Payments handles human checkout, MoR billing, GST/VAT, payouts. Their MCP plugin lets AI agents *spend* on behalf of a Dodo customer — outbound. **Inbound — agents paying *into* a SaaS — is the missing rail.** Dodonaut is that rail.

A merchant signs in with Google, connects Phantom, picks one of their existing Dodo products, and gets an x402 URL like `https://api.dodonaut.xyz/m/<slug>/p/<dodoProductId>`. AI agents call it, see HTTP 402, sign a USDC payment on Solana mainnet, retry, and get the response. The settlement lands as a Usage Event in the merchant's existing Dodo dashboard — billing/payouts/MoR don't change.

## Live mainnet proof

Three real x402 settlements on Solana mainnet — agent `5Q2r…7BGT` paying merchant `CFQB…dYXe` 0.10 USDC per call:

| Tx | Slot | Latency | Edge |
|---|---|---|---|
| [`451n3Z57nFu2jPZhRE3…`](https://solscan.io/tx/451n3Z57nFu2jPZhRE387ekLSq8cTPf93X4Sqrsn8MQR2Yw6oqFbNRNdKNpMAihtVdNWtdHq7Sgacm8oR6zMHJm9) | 419101798 | 4.7 s | https://api.dodonaut.xyz |
| [`2JzjkvyKdTJm9iptPB…`](https://solscan.io/tx/2JzjkvyKdTJm9iptPBnooSsvvu2LYFtiftvQJJ5KpcKsMdPs6HXLfjCWZ9F5Ycfd8qvRdGYuvoejQnExzRENbHec) | 418997550 | 3.4 s | (deployed IP) |
| [`5uuWdvKtHeCoB5fLDE…`](https://solscan.io/tx/5uuWdvKtHeCoB5fLDEWeUsHS3W7GWbf6i8sd4udcKujcnPi4vAwhXXKvcitsD2PXFjJjBZD3FSVMzonfJFeaVp95) | (local) | 5.8 s | localhost (dev) |

Each settled via the Coinbase CDP x402 facilitator, persisted to `on_chain_receipts`, ready to be re-emitted as a Dodo Usage Event by the reconciler.

## Architecture

```
┌──────────┐  402 ┌──────────────────────┐  verify+settle  ┌─────────────────┐
│ AI agent │─────▶│ apps/edge (Hono/Bun) │────────────────▶│ Coinbase CDP    │
│ (any LLM │◀─200─│ api.dodonaut.xyz     │◀────tx sig─────│ x402 facilitator│
│  client) │      └────────┬─────────────┘                 └────────┬────────┘
└──────────┘               │                                        │
                           │ proxy upstream                         │ tx
                           ▼                                        ▼
                  merchant's existing API                  Solana mainnet (USDC SPL)
                           │
                           │ post-hook: insert on_chain_receipts
                           ▼
                  ┌─────────────────────────┐
                  │ apps/reconciler         │  ingest as Dodo Usage Event
                  │ Helius webhook + poller │─────────────────────▶ Dodo dashboard
                  └─────────────────────────┘
```

## Repo layout

```
apps/
├── web/         Next.js 16 — sign in, connect Phantom, sync products from Dodo, wrap one-click
├── edge/        Hono on Bun — x402 paywall in front of merchant URLs (deployed to api.dodonaut.xyz)
└── reconciler/  Bun + Helius — webhook listener + 10s poller; ingests settlements as Dodo Usage Events
packages/
├── db/          Drizzle schema (merchants/products/endpoints/on_chain_receipts/agent_wallets + Better-Auth tables)
├── dodo/        Dodo SDK singleton + ingestSettlement() helper
└── shared/      USDC mints, network CAIP-2, env zod loader
```

## Stack

- **Edge:** Hono on Bun · `@x402/hono` v2 · `@x402/svm` ExactSvmScheme · `@coinbase/x402` (CDP facilitator with Ed25519 JWT)
- **Web:** Next.js 16 App Router · Better-Auth · `@dodopayments/better-auth` · Solana framework-kit (`@solana/kit` + `@solana/react-hooks`) · Phantom wallet adapter · Tailwind v4 + shadcn + Magic UI + Aceternity
- **Reconciler:** Bun + `helius-sdk` · enhanced webhook + 10s poller · Dodo `usageEvents.ingest` for idempotent settlement → dashboard
- **DB:** Postgres (Neon) + Drizzle ORM
- **Settlement:** USDC on Solana mainnet (CAIP-2 `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`)
- **Hosting:** Contabo VPS (edge + web) · Caddy auto-TLS · systemd

## Try it

The deployed edge is live and accepts payments today.

```bash
# 1. install bun
curl -fsSL https://bun.sh/install | bash

# 2. clone + install
git clone https://github.com/ayushsrivastavacodes/dodonaut.git
cd dodonaut
bun install

# 3. fund a Solana keypair with a few cents of mainnet USDC, then:
ENDPOINT_URL="https://api.dodonaut.xyz/m/ayush-srivastava-ejf3/p/pdt_0NXxx8ZiDffejKtGmcpYS" \
AGENT_KEYPAIR_FILE=~/.config/solana/your-agent.json \
SOLANA_NETWORK=mainnet \
  bun apps/edge/scripts/agent-call.ts
```

Expect: `402 → signed → 200` in ~5–7 s, plus a Solscan link printed at the end.

## Local dev

```bash
# edge
cd apps/edge && cp .env.example .env  # fill CDP key/secret + DATABASE_URL
bun run dev    # :4021

# web
cd apps/web && cp .env.example .env   # fill Better-Auth + Google OAuth + Dodo
bun run dev    # :3000

# reconciler
cd apps/reconciler && cp .env.example .env  # fill Helius + Dodo
bun run dev
```

DB migrations: `cd packages/db && bun run drizzle-kit migrate`.

## Why this wins

- **Real on-chain settlement on day 1** — three Solscan-verifiable mainnet payments before submission, not a devnet demo.
- **Slots into Dodo's existing rail** — uses their Usage Events API as the canonical revenue surface, so MoR/billing/GST/payouts stay 100% inside Dodo. Zero re-architecture for merchant.
- **Non-custodial** — Dodonaut never holds funds. Agent signs, USDC moves agent→merchant directly via SPL `transferChecked`. Facilitator is the only party that touches the tx and they sponsor the fee.
- **One missing rail, not yet-another-payments-stack** — Dodo themselves pointed at this gap in their April 10 blog post calling inbound agent payments "the bottleneck." Their MCP plugin is outbound. Dodonaut is the missing inbound rail.

## License

MIT — see [LICENSE](./LICENSE).

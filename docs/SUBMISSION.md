# Frontier submission copy — Dodonaut

> Paste-ready answers for arena.colosseum.org and any side track.

---

## One-line tagline (≤80 chars)
> The inbound agent-payments rail for Dodo Payments — pay-per-call x402 on Solana.

## Short description (≤300 chars)
> Dodonaut wraps any Dodo Payments product into an x402 HTTP endpoint that AI agents pay per call in USDC on Solana. Settled calls land as Usage Events in the merchant's existing Dodo dashboard, so MoR, billing, GST and payouts stay 100% inside Dodo.

## Long description (~1200 chars)
> Dodo Payments runs the merchant-of-record stack 8,000+ SaaS companies use to bill humans. Their MCP plugin lets AI agents spend on behalf of a Dodo customer — outbound. Inbound — AI agents paying *into* a SaaS for per-call API access — is the missing rail. Dodo themselves called it "the bottleneck" in their April 10 blog post.
>
> Dodonaut is that rail. A merchant signs in with Google, connects Phantom, picks any of their existing Dodo products, and gets an x402 URL. Agents call it, see HTTP 402, sign a USDC payment on Solana mainnet via the Coinbase CDP x402 facilitator, retry, and get the response. The reconciler emits each settled call as a Usage Event into the merchant's existing Dodo dashboard, where billing, GST, payouts, and MoR all already work.
>
> Built solo in 11 days for the Solana Frontier hackathon. Three real Solana mainnet settlements verified before submission, totaling 0.30 USDC moved through the deployed edge at api.dodonaut.xyz, each Solscan-clickable from the README.
>
> Stack: Hono on Bun + @x402/hono v2 + @coinbase/x402 (CDP facilitator) for the edge; Next.js 16 + Better-Auth + @dodopayments/better-auth + Solana framework-kit for the web app; Bun + helius-sdk for the reconciler; Postgres on Neon; Caddy auto-TLS on a Contabo VPS.

## Track
- **Main:** Solana Frontier
- **Side:** Dodo Payments (if listing exists — confirm with Dodo first)

## Live URLs
- Web app: https://dodonaut.xyz
- API edge: https://api.dodonaut.xyz/healthz
- Test endpoint: https://api.dodonaut.xyz/m/ayush-srivastava-ejf3/p/pdt_0NXxx8ZiDffejKtGmcpYS

## Repo
- https://github.com/ayushsrivastavacodes/dodonaut (MIT, public)

## Solscan proof (paste these in the supporting-materials field)
- https://solscan.io/tx/451n3Z57nFu2jPZhRE387ekLSq8cTPf93X4Sqrsn8MQR2Yw6oqFbNRNdKNpMAihtVdNWtdHq7Sgacm8oR6zMHJm9 — production HTTPS edge
- https://solscan.io/tx/2JzjkvyKdTJm9iptPBnooSsvvu2LYFtiftvQJJ5KpcKsMdPs6HXLfjCWZ9F5Ycfd8qvRdGYuvoejQnExzRENbHec — production IP edge
- https://solscan.io/tx/5uuWdvKtHeCoB5fLDEWeUsHS3W7GWbf6i8sd4udcKujcnPi4vAwhXXKvcitsD2PXFjJjBZD3FSVMzonfJFeaVp95 — local dev edge
- https://solscan.io/tx/26RTCtE9UcdHDTGGk8Xv4Zn6QhwVnAUjUVLaXYBkvcyHsYr9bA8KNVsC3JwEoz8ZG6qkn4kdv8Dgw3t9Bzkeum2N — merchant USDC ATA bootstrap

## Team

**Solo founder.** Ayush Srivastava — full-stack builder, Solana + payments + agents. Previously shipped multiple production SaaS apps; this submission was built in 11 days end-to-end (web app, x402 edge, reconciler, DB schema, mainnet wiring). Twitter: [@dodonaut_xyz](https://x.com/dodonaut_xyz). Email: web3ayush@gmail.com. GitHub: [@ayushsrivastavacodes](https://github.com/ayushsrivastavacodes).

## What was built (technical highlights)

- **Real Solana mainnet x402 settlement** via Coinbase CDP facilitator (the only public x402 facilitator that supports Solana mainnet as of May 2026). Switched from PayAI/x402.org after verifying via `/supported` endpoint that they only ship EVM.
- **Per-request payment routing** via x402 v2 `payTo` and `price` callbacks — every endpoint resolves merchant Solana address and Dodo product price from Postgres at request time, so a single edge handles N merchants without redeploy.
- **Bootstrap script** (`apps/edge/scripts/bootstrap-merchant-ata.ts`) that creates a merchant's USDC associated token account idempotently — needed because CDP's `transferChecked` tx fails on `InvalidAccountData` if the destination ATA doesn't exist.
- **Idempotent settlement ingestion** — Dodo Usage Events use `event_id = solana_signature` so the reconciler can retry without double-billing.
- **Dual-rail reconciliation** — eager insert in the edge's post-payment hook (sub-second dashboard signal) + Helius webhook + 10s poller fallback in the reconciler (canonical source of truth).

## What's *not* built (deliberately, per scope discipline)

- Custom MCP server — the strategic play is a PR to `dodopayments/dodo-agent-plugin` adding a `dodonaut-x402-endpoint` skill, not running our own MCP transport.
- Anchor refund/escrow program — log-and-manual-refund during hackathon; v1.1 escrow design documented in PRD §11.
- Self-hosted facilitator — CDP is $0.001/tx after 1k free; nowhere near that volume in the demo window.

## Ask
- Cohort 5 conversation
- Beta merchants among Frontier judges' portfolios
- Intro to Rishabh Goel @ Dodo for the agent-skill PR

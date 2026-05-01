# Dodonaut

**The agent rail for Dodo Payments.**

Paste a Dodo product ID → get an x402-protected URL → AI agents pay per call in USDG on Solana → each settled call lands in your existing Dodo dashboard via Usage Events. Your billing, payouts, MoR, GST stay 100% inside Dodo.

Built solo for the **[Solana Frontier Hackathon](https://colosseum.com/frontier)** (May 11, 2026 deadline).

## Why

Dodo's own April 10 blog post calls inbound agent payments *"the bottleneck holding back autonomous AI commerce."* Their MCP plugin is outbound-only — agents can configure Dodo, they cannot pay Dodo merchants. Dodonaut ships the missing inbound rail.

## Architecture

| App | Stack | Hosting |
|---|---|---|
| `apps/web` | Next.js 16 + Tailwind v4 + shadcn + Better-Auth + `@dodopayments/better-auth` | Vercel (`dodonaut.xyz`) |
| `apps/edge` | Hono + Bun + `@x402/hono` + `@x402/svm` | Vercel Functions (`api.dodonaut.xyz`) |
| `apps/reconciler` | Bun + `helius-sdk` + Dodo SDK | Fly.io (`dodonaut-reconciler.fly.dev`) |

| Package | Purpose |
|---|---|
| `packages/db` | Drizzle schema + Neon Postgres client |
| `packages/dodo` | Dodo SDK singleton + `ingestSettlement()` (Path A/B reconciliation) |
| `packages/shared` | USDG/USDC mints, x402 network constants, zod env loader |

## Getting started (local)

Prereqs: Bun ≥1.2, Node ≥20.

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/edge/.env.local
cp .env.example apps/reconciler/.env

bun install
bun run db:generate
bun run db:migrate

# Three windows:
bun --filter @dodonaut/web dev          # http://localhost:3000
bun --filter @dodonaut/edge dev          # http://localhost:4021
bun --filter @dodonaut/reconciler dev    # http://localhost:8080
```

## Critical reading

- **`Dodonaut-PRD.md`** (project root, parent dir) — full v2 PRD (1200 lines).
- **`docs/day1-verifications.md`** — V1–V7 architectural assumption testing.
- **`~/.claude/plans/mighty-tickling-glacier.md`** — 10-day build plan.

## License

MIT (planned for submission day).

# Day 1 Verifications — Dodonaut

> Date: **May 1, 2026**
> Purpose: prove (or disprove) the architectural assumptions of `Dodonaut-PRD.md` v2.0 + `~/.claude/plans/mighty-tickling-glacier.md` before writing any Day-2 code.
> Submission artifact: this doc is included in the Frontier submission as evidence of rigor.

---

## V1 — Coinbase CDP x402 facilitator supports `solana:mainnet` + USDG mint

**Status:** ⚠️ **Architecture confirmed; live probe blocked on CDP API key.**

**What we verified without auth:**
- Endpoint exists: `https://api.cdp.coinbase.com/platform/v2/x402` (returns `Unauthorized` on unauthenticated call — endpoint is live).
- Per `docs.x402.org/getting-started/quickstart-for-sellers`, the canonical Hono + Solana mainnet seller pattern is:
  ```ts
  import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
  import { ExactSvmScheme } from "@x402/svm/exact/server";
  import { HTTPFacilitatorClient } from "@x402/core/server";

  const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
  const facilitatorClient = new HTTPFacilitatorClient({
    url: "https://api.cdp.coinbase.com/platform/v2/x402",
  });

  app.use(
    paymentMiddleware(
      {
        "GET /weather": {
          accepts: [{ scheme: "exact", price: "$0.001", network: SOLANA_MAINNET, payTo: svmAddress }],
          description: "Weather data",
          mimeType: "application/json",
        },
      },
      new x402ResourceServer(facilitatorClient).register(SOLANA_MAINNET, new ExactSvmScheme()),
    ),
  );
  ```
- `payTo` is a base58 Solana wallet address — non-custodial; we never custody.
- Price is specified as USD string; facilitator handles conversion.

**What we cannot yet verify (USER ACTION):**
- Whether USDG mint `2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH` is in the supported asset list. Once user has CDP credentials, run:
  ```
  bun -e 'import {HTTPFacilitatorClient} from "@x402/core/server"; \
    const fc = new HTTPFacilitatorClient({url:"https://api.cdp.coinbase.com/platform/v2/x402", \
      headers: {Authorization: `Bearer ${process.env.COINBASE_CDP_API_KEY}`}}); \
    console.log(await fc.supported());'
  ```

**Fallback if Coinbase doesn't support USDG-Solana:** PayAI facilitator at `https://facilitator.payai.network` (lists Solana support; free; multi-chain). If PayAI also fails → AutoIncentive (free Solana facilitator) → SolPay → Kora self-host (Day 11 contingency only).

**Decision:** Proceed with Coinbase CDP as primary; first action on Day 5 morning is to verify with the actual key. PayAI URL is pre-configured in `packages/shared/src/networks.ts`.

---

## V2 — Dodo `POST /events/ingest` accepts arbitrary `customer_id` strings (BIGGEST ARCHITECTURAL RISK)

**Status:** 🟡 **Schema confirmed; live test blocked on Dodo sandbox API key.**

**What we verified from the SDK (`dodopayments` v2.30.0):**
- Method: `dodo.usageEvents.ingest({events: [...]})` (NOT the deprecated `payments.create`).
- `EventInput.customer_id` is typed as `string` with no format constraint (no `cus_xxx` regex enforced at the SDK layer).
- Constraints:
  - **Max 1000 events per request** (we send 1 at a time).
  - **Timestamps older than 1h OR more than 5min in the future are rejected.** Mitigation: we clamp in `packages/dodo/src/ingest.ts` `clampTimestamp()`, surface the clamping in `metadata.timestamp_clamped`.
  - **Metadata: max 50 KV pairs, keys ≤100 chars, values ≤500 chars.** Our 9 fields fit comfortably.
  - **`event_id` is the idempotency key** — using `solana_signature` is safe; retries are silently deduped.
  - Duplicate `event_id` in same request rejects the entire batch (we never batch).

**Live test (USER ACTION, after sandbox key):**
```bash
curl -X POST https://test.dodopayments.com/events/ingest \
  -H "Authorization: Bearer $DODO_PAYMENTS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "event_id": "dodonaut_v2_test_'$(date +%s)'",
      "customer_id": "dodonaut_agent_TEST123",
      "event_name": "dodonaut.v2_test",
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
      "metadata": {"v2_test": "true"}
    }]
  }'
```

Expected if Path A works: `{"ingested_count": 1}`. If 404/422 with "customer not found" → Path B is required.

**Fallback (Path B) — already implemented:** `merchants.dodo_agents_customer_id` column pre-added in `packages/db/src/schema.ts`. If Path B is needed:
1. On signup, after the user's Dodo customer is auto-created via Better-Auth, make a second `dodo.customers.create({email: agents+slug@dodonaut.xyz, name: "Dodonaut Agents (slug)", metadata: {kind: "agents_aggregate"}})` call.
2. Store returned `cus_xxx` in `merchants.dodo_agents_customer_id`.
3. Pass it as `sentinelCustomerId` to `ingestSettlement()`.

Either path is invisible to the merchant — their billing meter ticks identically. Difference is only in the Dodo `Customers` view (one synthetic customer per merchant vs one per agent wallet).

---

## V3 — `@dodopayments/better-auth` `createCustomerOnSignUp: true` mints a Dodo customer on Google OAuth

**Status:** 🟡 **Plugin shape confirmed from docs; live test blocked on Dodo sandbox + Google OAuth credentials.**

**What we verified from docs (`docs.dodopayments.com/developer-resources/better-auth-adaptor`):**
- Plugin signature:
  ```ts
  dodopayments({
    client: dodoPayments,
    createCustomerOnSignUp: true,
    getCustomerParams: (user) => ({ metadata: { dodonaut_merchant_id: user.id } }),
    use: [portal(), usage(), webhooks({...})],
  })
  ```
- Auto-mounted webhook endpoint: `/api/auth/dodopayments/webhooks` (Standard Webhooks signature verified by the plugin).
- Sub-plugins: `checkout`, `portal`, `usage`, `webhooks`. We use `portal`, `usage`, `webhooks` in v1.

**Live test (USER ACTION):**
1. With Dodo sandbox API key in `.env.local` and Google OAuth client configured, sign up via `/signup`.
2. Run: `bunx dodopayments customers list --email <test_email>`. Expect a `cus_xxx` returned.
3. Verify in Dodo sandbox dashboard → Customers tab.

**Fallback if it silently fails:** add a manual `dodo.customers.create()` call inside Better-Auth's `databaseHooks.user.create.after` hook (~20 LOC). Documented but not yet implemented.

---

## V4 — Helius enhanced webhook fires for SPL TRANSFER within 5s (BLOCKED on Helius account)

**Status:** ⏳ **Architecture spec ready; needs Helius API key + test ATA.**

**Plan (USER ACTION):**
1. Sign up for Helius Developer plan ($19/mo).
2. Create webhook via dashboard:
   ```json
   {
     "webhookURL": "https://dodonaut-reconciler.fly.dev/api/webhooks/helius",
     "transactionTypes": ["TRANSFER"],
     "txnStatus": "success",
     "accountAddresses": ["<test ATA>"],
     "webhookType": "enhanced",
     "encoding": "jsonParsed",
     "authHeader": "<random secret, also stored in HELIUS_WEBHOOK_SECRET>"
   }
   ```
3. Send a 1-USDC test transfer on devnet to that ATA.
4. Time the webhook arrival.

**Pass criterion:** webhook fires within 5s of finality. Dodo's ingestion window is 1h, so anything <60min works for billing — but 5s is needed to make the demo Loom feel instant.

**Fallback if >10s consistently:** invert ordering — make 5s polling the primary mechanism, treat webhook as belt-and-braces.

**Critical implementation note:** watch the merchant's **USDG ATA and USDC ATA**, not their main wallet pubkey. ATAs are computed deterministically:
```ts
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
const usdgAta = getAssociatedTokenAddressSync(USDG_MINT, merchantWallet);
const usdcAta = getAssociatedTokenAddressSync(USDC_MINT, merchantWallet);
```

---

## V5 — `@x402/svm` + `@x402/hono` + `@x402/core` published to npm and install cleanly

**Status:** ✅ **GREEN.**

**Verified:**
- All packages at `2.11.0` (latest, published Feb 2026).
- `@x402/svm` peer-deps on `@solana/kit >=5.1.0` (current: 6.8.0). **NOT** `@solana/web3.js` legacy.
- Exports verified: `ExactSvmScheme`, `ClientSvmConfig`, `ClientSvmSigner`, `FacilitatorRpcClient`, `FacilitatorSvmSigner`, `toClientSvmSigner`, `toFacilitatorSvmSigner`, `SettlementCache`.
- Constants: `TOKEN_PROGRAM_ADDRESS`, `TOKEN_2022_PROGRAM_ADDRESS`, `COMPUTE_BUDGET_PROGRAM_ADDRESS`, `MEMO_PROGRAM_ADDRESS`, `LIGHTHOUSE_PROGRAM_ADDRESS` — Phantom and Solflare's Lighthouse instructions are handled gracefully.
- `@x402/hono` exports `paymentMiddleware`, `x402ResourceServer`, `HonoAdapter`, plus types from `@x402/core/server`.
- Author: "x402 Foundation" (the Linux Foundation entity announced April 30).
- Repo: `github.com/x402-foundation/x402`.

**Architectural implication noted:** Dodonaut runs **two parallel Solana stacks**:
- **Browser** (wallet connect, signing): `@solana/web3.js` 1.x via `@solana/wallet-adapter-react`.
- **Server** (x402 verification, settlement, RPC parsing): `@solana/kit` 2.x via `@x402/svm`.
- They interop fine — wallet-adapter-signed transactions are still parseable by `@solana/kit`.

---

## V6 — Confirm Dodo crypto stack lacks USDG-on-Solana

**Status:** ✅ **GREEN — wedge confirmed open.**

**Verified earlier (April 30) from `docs.dodopayments.com/features/payment-methods/crypto`:**

| Token | Dodo's supported networks |
|---|---|
| USDC | Ethereum, Solana, Polygon, Base |
| USDP | Ethereum, Solana |
| **USDG** | **Ethereum only** ← Solana absent |

Plus: Dodo's crypto checkout is **not available in India**, and merchants always settle in USD fiat (no self-custody). All three are Dodonaut wedges.

---

## V7 — Phantom wallet adapter compatible with Next.js 16 + React 19

**Status:** ✅ **GREEN.**

**Verified package versions and peer dependencies:**
- `@solana/wallet-adapter-react` 0.15.39 — peer `react: '*'` (so React 19 is fine).
- `@solana/wallet-adapter-react-ui` 0.9.39 — peer `react: '*'`, `react-dom: '*'`.
- `@solana/wallet-adapter-phantom` 0.9.29 — no React peer.
- `@solana/wallet-adapter-base` 0.9.27.
- `@solana/web3.js` 1.98.4 (legacy 1.x; what wallet-adapter consumes).
- `@solana/spl-token` 0.4.14 — peer `@solana/web3.js: ^1.95.5`.
- `next` 16.2.4 — peer `react: '^18.2.0 || 19.0.0-rc-... || ^19.0.0'`.
- `react` 19.2.5 stable.

**Decision:** No need for the Solana Foundation `framework-kit` fallback. Standard wallet-adapter pattern in `apps/web/components/wallet-provider.tsx` (Day 2).

---

## Verification Summary

| ID | Title | Status | Blocked on |
|---|---|---|---|
| V1 | Coinbase x402 Solana support | ⚠️ Architecture confirmed | CDP API key |
| V2 | Dodo arbitrary customer_id | 🟡 Schema confirmed | Dodo sandbox key |
| V3 | Better-Auth Dodo plugin | 🟡 Schema confirmed | Dodo + Google OAuth |
| V4 | Helius webhook latency | ⏳ Spec ready | Helius account |
| V5 | x402 packages | ✅ GREEN | — |
| V6 | Dodo USDG-Solana absent | ✅ GREEN | — |
| V7 | Wallet adapter on Next 16 | ✅ GREEN | — |

**Day 2 unblocks the moment user provides:** Dodo sandbox API key + webhook secret + Google OAuth client + Helius API key. With those four, V2/V3/V4 resolve in <30 minutes.

---

## Architectural decisions locked from Day 1 verifications

1. **Two Solana stacks**: `@solana/web3.js` 1.x (browser) + `@solana/kit` 6.x (server).
2. **Reconciliation API**: `dodo.usageEvents.ingest({events: [...]})`. Event_id = Solana signature for idempotency. Timestamp clamped to Dodo's [-1h, +5min] window in `clampTimestamp()`.
3. **Path A/B reconciliation**: column `merchants.dodo_agents_customer_id` pre-added to schema. V2 outcome decides which path is active.
4. **x402 facilitator**: Coinbase CDP primary; PayAI fallback. Mainnet CAIP-2: `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`.
5. **USDG featured**: first entry in `accepts` array; USDC second as fallback. Mints in `packages/shared/src/mints.ts`.
6. **Settlement watching**: Helius enhanced webhooks on merchant USDG/USDC ATAs (computed via `getAssociatedTokenAddressSync`), NOT main wallet. 10s poller as belt-and-braces.
7. **No Anchor program**: SPL transfers + facilitator verification cover v1.

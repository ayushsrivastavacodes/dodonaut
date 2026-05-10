/**
 * Dodonaut Edge — x402 paywall in front of merchant upstream URLs.
 *
 * Wired against verified APIs (per x402 docs/getting-started/quickstart-for-sellers):
 *  - @x402/hono `paymentMiddleware(routes, server, paywallConfig?, paywall?, syncFacilitatorOnStart?)`
 *  - @x402/svm/exact/server `ExactSvmScheme` (peers on @solana/kit)
 *  - @x402/core/server `x402ResourceServer` + `HTTPFacilitatorClient`
 *  - PaymentOption supports DynamicPayTo + DynamicPrice callbacks → per-request DB resolution
 *  - `price` is a USD Money string (e.g. "$0.05"); ExactSvmScheme natively
 *    converts to USDC atomic units — no AssetAmount/extra needed.
 *
 * Routing:
 *   GET/POST /m/:merchantSlug/p/:dodoProductId
 *     → 402 Payment Required with USDC accepts
 *     → on settled payment, proxies the agent's request to endpoints.upstream_url
 *     → eagerly inserts on_chain_receipts row (Day 5 reconciler enriches)
 */
import { Hono, type Context } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { paymentMiddleware } from "@x402/hono";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { createFacilitatorConfig } from "@coinbase/x402";
import { baseUnitsToUsdString } from "@dodonaut/shared/mints";
import { caip2For, type Caip2Network } from "@dodonaut/shared/networks";
import { resolveEndpoint } from "./lib/endpoint-resolver";
import { proxyToUpstream } from "./lib/proxy";
import { logSettlement } from "./lib/settlement-logger";

const NETWORK = (process.env.SOLANA_NETWORK ?? "devnet") as "mainnet" | "devnet";
const NETWORK_CAIP2: Caip2Network = caip2For(NETWORK);

// Coinbase CDP is the only public x402 facilitator that supports Solana
// mainnet (verified May 2026 — PayAI/x402.org are EVM-only). createFacilitatorConfig
// from @coinbase/x402 handles Ed25519 JWT auth via @coinbase/cdp-sdk and
// returns the URL + createAuthHeaders callback HTTPFacilitatorClient expects.
const cdpKeyId = process.env.COINBASE_CDP_API_KEY;
const cdpKeySecret = process.env.COINBASE_CDP_API_SECRET;
if (!cdpKeyId || !cdpKeySecret) {
  throw new Error(
    "COINBASE_CDP_API_KEY + COINBASE_CDP_API_SECRET required (Solana mainnet only supported via CDP facilitator)",
  );
}
const facilitatorConfig = createFacilitatorConfig(cdpKeyId, cdpKeySecret);
const FACILITATOR_URL = facilitatorConfig.url;
const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK_CAIP2,
  new ExactSvmScheme(),
);

// Single PaymentOption: USDC on the configured network. payTo + price resolve
// per-request from DB. Money string format ("$0.05") leverages ExactSvmScheme's
// default USDC conversion — no AssetAmount required.
const acceptsConfig = [
  {
    scheme: "exact",
    network: NETWORK_CAIP2,
    payTo: async (ctx: { path: string }): Promise<string> => {
      const ep = await resolveEndpoint(ctx.path);
      if (!ep) throw new Error(`Endpoint not found: ${ctx.path}`);
      if (!ep.merchantSolanaAddress) {
        throw new Error(
          `Merchant ${ep.merchantSlug} has no Solana address — onboarding incomplete`,
        );
      }
      return ep.merchantSolanaAddress;
    },
    price: async (ctx: { path: string }): Promise<string> => {
      const ep = await resolveEndpoint(ctx.path);
      if (!ep) throw new Error(`Endpoint not found: ${ctx.path}`);
      return `$${baseUnitsToUsdString(ep.priceUsdBaseUnits)}`;
    },
    maxTimeoutSeconds: 60,
  },
];

const app = new Hono();

app.use("*", logger());
app.use("*", cors({ origin: "*" }));

app.get("/healthz", (c) =>
  c.json({
    ok: true,
    service: "dodonaut-edge",
    version: "0.2.0",
    network: NETWORK,
    network_caip2: NETWORK_CAIP2,
    facilitator: FACILITATOR_URL,
    asset: "USDC",
    timestamp: new Date().toISOString(),
  }),
);

// Post-settlement hook — runs *after* paymentMiddleware so c.res.headers has
// the `payment-response` header that the middleware sets post-settlement.
// Eagerly inserts on_chain_receipts row; the Day-5 reconciler enriches later.
app.use("/m/:merchantSlug/p/:dodoProductId", async (c, next) => {
  const startedAt = Date.now();
  await next();

  if (!c.res || c.res.status >= 400) return;

  const xpr = c.res.headers.get("payment-response");
  if (!xpr) return;

  try {
    const parsed = JSON.parse(Buffer.from(xpr, "base64").toString("utf-8")) as {
      transaction?: string;
      payer?: string;
      amount?: string;
    };
    if (!parsed.transaction || !parsed.payer) return;

    const ep = await resolveEndpoint(c.req.path);
    if (!ep) return;

    const amountBaseUnits = parsed.amount
      ? BigInt(parsed.amount)
      : ep.priceUsdBaseUnits;

    void logSettlement({
      signature: parsed.transaction,
      agentWallet: parsed.payer,
      amountBaseUnits,
      asset: "USDC",
      network: NETWORK_CAIP2,
      endToEndLatencyMs: Date.now() - startedAt,
      endpoint: ep,
    }).catch((err) => {
      console.error("logSettlement failed (Day-5 reconciler will retry)", err);
    });
  } catch (err) {
    console.warn("could not parse payment-response header", err);
  }
});

app.use(
  "/m/:merchantSlug/p/:dodoProductId",
  paymentMiddleware(
    {
      accepts: acceptsConfig,
      description: "Dodonaut x402 endpoint — agent pay-per-call",
      mimeType: "application/json",
    },
    resourceServer,
    undefined,
    undefined,
    true, // syncFacilitatorOnStart — fetch supported kinds before first request
  ),
);

async function handleProxied(c: Context) {
  const ep = await resolveEndpoint(c.req.path);
  if (!ep) return c.notFound();
  return proxyToUpstream(c, ep.upstreamUrl);
}

app.get("/m/:merchantSlug/p/:dodoProductId", handleProxied);
app.post("/m/:merchantSlug/p/:dodoProductId", handleProxied);

const port = Number(process.env.PORT ?? 4021);
console.log(
  `Dodonaut edge listening on :${port} | network=${NETWORK} (${NETWORK_CAIP2}) | asset=USDC | facilitator=${FACILITATOR_URL}`,
);
export default { fetch: app.fetch, port };

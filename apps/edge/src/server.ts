/**
 * Dodonaut Edge — x402 paywall in front of merchant upstream URLs.
 *
 * Wired against verified APIs:
 *  - @x402/hono `paymentMiddleware(routes, server, paywallConfig?, paywall?, syncFacilitatorOnStart?)`
 *  - @x402/svm/exact/server `ExactSvmScheme` (peers on @solana/kit, not web3.js)
 *  - @x402/core/server `x402ResourceServer` + `HTTPFacilitatorClient`
 *  - PaymentOption supports DynamicPayTo + DynamicPrice callbacks → per-request DB resolution
 *  - Asset is encoded inside `price` as AssetAmount (no top-level `asset` field on PaymentOption)
 *
 * Routing:
 *   GET/POST /m/:merchantSlug/p/:dodoProductId
 *     → 402 Payment Required with USDG (mainnet only) + USDC accepts
 *     → on settled payment, proxies the agent's request to endpoints.upstream_url
 *     → eagerly inserts on_chain_receipts row (Day 5 reconciler is canonical truth)
 */
import { Hono, type Context } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { paymentMiddleware } from "@x402/hono";
import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import {
  USDG_MINT_MAINNET,
  USDC_MINT_MAINNET,
  USDC_MINT_DEVNET,
  baseUnitsToUsdString,
  symbolFromMint,
  type AssetSymbol,
} from "@dodonaut/shared/mints";
import { caip2For, type Caip2Network } from "@dodonaut/shared/networks";
import { resolveEndpoint, parsePath } from "./lib/endpoint-resolver.js";
import { proxyToUpstream } from "./lib/proxy.js";
import { logSettlement } from "./lib/settlement-logger.js";

const NETWORK = (process.env.SOLANA_NETWORK ?? "devnet") as "mainnet" | "devnet";
const NETWORK_CAIP2: Caip2Network = caip2For(NETWORK);
const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";

// Featured asset list per network.
// Mainnet: USDG primary (sponsor + market signal), USDC fallback.
// Devnet:  USDC only (USDG isn't on devnet).
const ASSETS_FOR_NETWORK: Array<{ symbol: AssetSymbol; mint: string }> =
  NETWORK === "mainnet"
    ? [
        { symbol: "USDG", mint: USDG_MINT_MAINNET },
        { symbol: "USDC", mint: USDC_MINT_MAINNET },
      ]
    : [{ symbol: "USDC", mint: USDC_MINT_DEVNET }];

// One facilitator client + one resource server, reused across all requests.
const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
  ...(process.env.COINBASE_CDP_API_KEY && {
    createAuthHeaders: async () => {
      const auth = `Bearer ${process.env.COINBASE_CDP_API_KEY!}`;
      const headers = { Authorization: auth };
      return { verify: headers, settle: headers, supported: headers };
    },
  }),
});

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK_CAIP2,
  new ExactSvmScheme(),
);

// Build the dynamic accepts array — one PaymentOption per accepted asset.
// payTo + price resolve per request from DB. The asset mint is encoded inside
// `price` as an AssetAmount object (NOT a top-level PaymentOption field).
const dynamicAccepts = ASSETS_FOR_NETWORK.map((asset) => ({
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
  price: async (
    ctx: { path: string },
  ): Promise<{ asset: string; amount: string }> => {
    const ep = await resolveEndpoint(ctx.path);
    if (!ep) throw new Error(`Endpoint not found: ${ctx.path}`);
    return {
      asset: asset.mint,
      amount: ep.priceUsdBaseUnits.toString(),
    };
  },
  maxTimeoutSeconds: 60,
}));

const app = new Hono();

app.use("*", logger());
app.use("*", cors({ origin: "*" }));

app.get("/healthz", (c) =>
  c.json({
    ok: true,
    service: "dodonaut-edge",
    version: "0.1.0",
    network: NETWORK,
    network_caip2: NETWORK_CAIP2,
    facilitator: FACILITATOR_URL,
    assets: ASSETS_FOR_NETWORK.map((a) => a.symbol),
    timestamp: new Date().toISOString(),
  }),
);

// Apply the x402 payment middleware. Single static route; payTo + price
// resolve dynamically per request.
app.use(
  "/m/:merchantSlug/p/:dodoProductId",
  paymentMiddleware(
    {
      accepts: dynamicAccepts,
      description: "Dodonaut x402 endpoint — agent pay-per-call",
      mimeType: "application/json",
    },
    resourceServer,
    undefined, // paywallConfig (no HTML paywall)
    undefined, // paywall provider (none)
    false, // syncFacilitatorOnStart=false — sync lazily on first request
  ),
);

// Post-payment handler: middleware has verified + settled. Proxy to upstream.
async function handleProxied(c: Context) {
  const startedAt = Date.now();
  const ep = await resolveEndpoint(c.req.path);
  if (!ep) return c.notFound();

  const upstreamRes = await proxyToUpstream(c, ep.upstreamUrl);

  // Parse settlement details from the x-payment-response header set by middleware.
  // Format: base64(JSON({ success, transaction, network, amount, payer, asset, ... }))
  let signature: string | null = null;
  let agentWallet: string | null = null;
  let assetMint: string | null = null;
  let amountBaseUnits: bigint = ep.priceUsdBaseUnits;
  try {
    const xpr =
      c.res?.headers.get("x-payment-response") ??
      upstreamRes.headers.get("x-payment-response");
    if (xpr) {
      const parsed = JSON.parse(
        Buffer.from(xpr, "base64").toString("utf-8"),
      ) as {
        transaction?: string;
        payer?: string;
        amount?: string;
        asset?: string;
      };
      signature = parsed.transaction ?? null;
      agentWallet = parsed.payer ?? null;
      assetMint = parsed.asset ?? null;
      if (parsed.amount) amountBaseUnits = BigInt(parsed.amount);
    }
  } catch (err) {
    console.warn("could not parse x-payment-response header", err);
  }

  // Eagerly persist receipt; Day-5 reconciler enriches with block_time + dodo_event_id.
  if (signature && agentWallet) {
    const symbol: AssetSymbol = assetMint
      ? (symbolFromMint(assetMint) ?? "USDC")
      : "USDC";
    void logSettlement({
      signature,
      agentWallet,
      amountBaseUnits,
      asset: symbol,
      network: NETWORK_CAIP2,
      endToEndLatencyMs: Date.now() - startedAt,
      endpoint: ep,
    }).catch((err) => {
      console.error("logSettlement failed (Day-5 reconciler will retry)", err);
    });
  }

  return upstreamRes;
}

app.get("/m/:merchantSlug/p/:dodoProductId", handleProxied);
app.post("/m/:merchantSlug/p/:dodoProductId", handleProxied);

const port = Number(process.env.PORT ?? 4021);
console.log(
  `Dodonaut edge listening on :${port} | network=${NETWORK} (${NETWORK_CAIP2}) | facilitator=${FACILITATOR_URL}`,
);
export default { fetch: app.fetch, port };

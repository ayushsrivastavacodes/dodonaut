/**
 * Server-only `wrapProduct` helper.
 *
 * Turns a Dodo product into a Dodonaut x402 endpoint:
 *   1. (Idempotent) Create a per-endpoint Dodo Meter that filters
 *      events by metadata.dodonaut_endpoint_id == <our endpoint id>,
 *      with event_name "dodonaut.x402_call" + aggregation "count".
 *      This is the meter the merchant can attach to a usage-based product
 *      in their Dodo dashboard for billing.
 *   2. Insert a row into our `endpoints` table.
 *   3. Return the canonical Naka-style URL + a 5-line TS snippet
 *      the merchant can paste into their MCP server / API client.
 *
 * Per dodopayments:usage-based-billing skill:
 *   "event_name (exact match, case-sensitive)" — meter must use the same
 *   event_name we send from packages/dodo/src/ingest.ts.
 */
import { getDb } from "@dodonaut/db/client";
import {
  endpoints,
  products,
  type Endpoint,
  type Merchant,
  type Product,
} from "@dodonaut/db/schema";
import { getDodoClient } from "@dodonaut/dodo/client";
import { usdStringToBaseUnits } from "@dodonaut/shared/mints";
import { and, eq } from "drizzle-orm";

export interface WrapInput {
  productId: string; // our internal products.id (uuid)
  upstreamUrl: string;
  priceUsd: string; // "0.05"
  description?: string;
}

export interface WrapOutput {
  endpoint: Endpoint;
  url: string;
  snippet: string;
  meterId: string;
}

export async function wrapProduct(
  merchant: Merchant,
  input: WrapInput,
): Promise<WrapOutput> {
  const db = getDb();

  // Find the product, scoped to this merchant.
  const productRows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.id, input.productId),
        eq(products.merchantId, merchant.id),
      ),
    )
    .limit(1);
  const product = productRows[0];
  if (!product) throw new Error("Product not found or not owned by merchant");

  // Insert the endpoint first so we have its UUID for the meter filter.
  const priceBaseUnits = usdStringToBaseUnits(input.priceUsd);
  const inserted = await db
    .insert(endpoints)
    .values({
      productId: product.id,
      merchantId: merchant.id,
      upstreamUrl: input.upstreamUrl,
      priceUsdBaseUnits: priceBaseUnits,
      acceptedAssets: ["USDC", "USDG"],
      description: input.description ?? `${product.name} — single API call`,
      mode: "x402",
      enabled: true,
    })
    .returning();
  const endpoint = inserted[0]!;

  // Create or reuse the Dodo Meter for this endpoint.
  const meterId = await ensureMeterForEndpoint({
    endpointId: endpoint.id,
    productName: product.name,
    existingMeterId: product.dodoMeterId,
  });

  // If we created a fresh meter, persist it on the product.
  if (!product.dodoMeterId) {
    await db
      .update(products)
      .set({ dodoMeterId: meterId, updatedAt: new Date() })
      .where(eq(products.id, product.id));
  }

  const slug = merchant.slug;
  const apiBase = process.env.NEXT_PUBLIC_DODONAUT_API_BASE ?? "http://localhost:4021";
  const url = `${apiBase}/m/${slug}/p/${product.dodoProductId}`;

  const snippet = generateSnippet(url, input.priceUsd);

  return { endpoint, url, snippet, meterId };
}

async function ensureMeterForEndpoint(args: {
  endpointId: string;
  productName: string;
  existingMeterId: string | null;
}): Promise<string> {
  const dodo = getDodoClient();

  // Reuse the existing meter if the product already has one — keeps the
  // wrap flow idempotent on retry. Otherwise create a fresh one.
  if (args.existingMeterId) return args.existingMeterId;

  const meter = await dodo.meters.create({
    name: `Dodonaut · ${args.productName}`.slice(0, 96),
    event_name: "dodonaut.x402_call",
    aggregation: { type: "count" },
    measurement_unit: "calls",
    filter: {
      conjunction: "and",
      clauses: [
        {
          key: "dodonaut_endpoint_id",
          operator: "equals",
          value: args.endpointId,
        },
      ],
    },
    description:
      "Auto-created by Dodonaut. Counts settled x402 calls for this endpoint.",
  });
  return meter.id;
}

function generateSnippet(url: string, priceUsd: string): string {
  return [
    `// Agent client (TypeScript) — https://x402.org`,
    `import { wrapFetchWithPayment } from "@x402/fetch";`,
    `import { createSvmSigner } from "@x402/svm/client";`,
    ``,
    `const signer = await createSvmSigner({ /* your Solana keypair */ });`,
    `const fetchPaid = wrapFetchWithPayment(fetch, signer);`,
    ``,
    `// Costs ≈ $${priceUsd} USDC per call (USDG also accepted). Settles in <900ms on Solana.`,
    `const res = await fetchPaid("${url}");`,
    `console.log(await res.json());`,
  ].join("\n");
}

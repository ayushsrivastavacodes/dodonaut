/**
 * Resolve a Dodonaut endpoint from a request path like
 *   /m/{merchantSlug}/p/{dodoProductId}
 *
 * Used by the x402 paymentMiddleware's DynamicPayTo/DynamicPrice callbacks
 * AND by the post-payment proxy handler.
 */
import { getDb } from "@dodonaut/db/client";
import { endpoints, merchants, products } from "@dodonaut/db/schema";
import { and, eq } from "drizzle-orm";

export interface ResolvedEndpoint {
  endpointId: string;
  merchantId: string;
  merchantSlug: string;
  merchantSolanaAddress: string;
  productId: string;
  dodoProductId: string;
  productName: string;
  upstreamUrl: string;
  priceUsdBaseUnits: bigint;
  description: string | null;
  enabled: boolean;
}

const PATH_RE = /^\/m\/([^/]+)\/p\/([^/]+)$/;

export function parsePath(
  path: string,
): { merchantSlug: string; dodoProductId: string } | null {
  const m = PATH_RE.exec(path);
  if (!m) return null;
  return { merchantSlug: m[1]!, dodoProductId: m[2]! };
}

export async function resolveEndpoint(
  path: string,
): Promise<ResolvedEndpoint | null> {
  const parsed = parsePath(path);
  if (!parsed) return null;

  const db = getDb();
  const rows = await db
    .select({
      endpointId: endpoints.id,
      merchantId: merchants.id,
      merchantSlug: merchants.slug,
      merchantSolanaAddress: merchants.solanaAddress,
      productId: products.id,
      dodoProductId: products.dodoProductId,
      productName: products.name,
      upstreamUrl: endpoints.upstreamUrl,
      priceUsdBaseUnits: endpoints.priceUsdBaseUnits,
      description: endpoints.description,
      enabled: endpoints.enabled,
    })
    .from(endpoints)
    .innerJoin(merchants, eq(merchants.id, endpoints.merchantId))
    .innerJoin(products, eq(products.id, endpoints.productId))
    .where(
      and(
        eq(merchants.slug, parsed.merchantSlug),
        eq(products.dodoProductId, parsed.dodoProductId),
        eq(endpoints.enabled, true),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Pull merchant's Dodo products and upsert into our local `products` table.
 * Called from /dashboard "Sync from Dodo" button + can be called server-side on demand.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDodoClient } from "@dodonaut/dodo/client";
import { getDb } from "@dodonaut/db/client";
import {
  merchants,
  products,
  type NewProduct,
} from "@dodonaut/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const db = getDb();
  const merchantRows = await db
    .select()
    .from(merchants)
    .where(eq(merchants.userId, session.user.id))
    .limit(1);
  const merchant = merchantRows[0];
  if (!merchant) {
    return NextResponse.json({ error: "no merchant row" }, { status: 404 });
  }

  const dodo = getDodoClient();
  const list = await dodo.products.list({ page_size: 100 });
  const items = list?.items ?? [];

  // Verified against Dodo SDK ProductListResponse type + docs:
  //   - `price` is at the top level, integer in the smallest currency
  //     denomination (cents for USD; e.g. $0.05 = 5).
  //   - `price_detail` (with the `one_time | recurring | usage_based`
  //     discriminator) is NOT on the LIST response — only on retrieve(id).
  //   - We approximate type from `is_recurring` only. Usage detection
  //     would require a per-product retrieve() call (skipped in v1).
  // Convert cents → USDC base units (6 decimals): cents * 10000.
  let upserted = 0;
  type DodoListItem = {
    product_id: string;
    name?: string | null;
    price?: number | null;
    is_recurring: boolean;
    currency?: string | null;
  };
  for (const raw of items) {
    const p = raw as DodoListItem;
    if (!p.product_id) continue;
    const name = p.name ?? "(unnamed product)";
    const priceCents = BigInt(p.price ?? 0);
    const priceUsdBaseUnits = priceCents * 10000n;
    const type: NewProduct["type"] = p.is_recurring
      ? "subscription"
      : "one_time";

    const slug = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 32)}-${p.product_id.slice(-6)}`;

    await db
      .insert(products)
      .values({
        merchantId: merchant.id,
        dodoProductId: p.product_id,
        slug,
        name,
        type,
        priceUsdBaseUnits,
        rawDodoProduct: raw as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: [products.merchantId, products.dodoProductId],
        set: {
          name,
          type,
          priceUsdBaseUnits,
          rawDodoProduct: raw as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });
    upserted++;
  }

  // Form post: redirect back to dashboard.
  if (req.headers.get("accept")?.includes("text/html")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.json({ ok: true, upserted });
}

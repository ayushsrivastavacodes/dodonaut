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

  let upserted = 0;
  for (const p of items) {
    const productId = (p as { product_id?: string }).product_id;
    if (!productId) continue;
    const name = (p as { name?: string | null }).name ?? "(unnamed product)";
    const priceObj = (p as { price?: { price?: number } }).price;
    const priceUsdBaseUnits = BigInt(priceObj?.price ?? 0);
    const isRecurring = Boolean(
      (p as { is_recurring?: boolean }).is_recurring,
    );
    const isUsage = Boolean(
      (p as { is_usage_based?: boolean }).is_usage_based,
    );
    const type: NewProduct["type"] = isUsage
      ? "usage"
      : isRecurring
        ? "subscription"
        : "one_time";

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32)}-${productId.slice(-6)}`;

    await db
      .insert(products)
      .values({
        merchantId: merchant.id,
        dodoProductId: productId,
        slug,
        name,
        type,
        priceUsdBaseUnits,
        rawDodoProduct: p as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: [products.merchantId, products.dodoProductId],
        set: {
          name,
          type,
          priceUsdBaseUnits,
          rawDodoProduct: p as unknown as Record<string, unknown>,
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

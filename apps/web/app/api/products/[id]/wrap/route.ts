import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { wrapProduct } from "@/lib/wrap";
import { getDb } from "@dodonaut/db/client";
import { merchants } from "@dodonaut/db/schema";
import { eq } from "drizzle-orm";

const Body = z.object({
  upstreamUrl: z.string().url(),
  priceUsd: z.string().regex(/^\d+(\.\d{1,6})?$/, "Use a decimal like 0.05"),
  description: z.string().max(280).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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

  try {
    const result = await wrapProduct(merchant, {
      productId: id,
      upstreamUrl: parsed.data.upstreamUrl,
      priceUsd: parsed.data.priceUsd,
      description: parsed.data.description,
    });
    return NextResponse.json({
      ok: true,
      endpointId: result.endpoint.id,
      url: result.url,
      snippet: result.snippet,
      meterId: result.meterId,
    });
  } catch (err) {
    console.error("wrapProduct failed", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "wrapProduct failed unknown error",
      },
      { status: 500 },
    );
  }
}

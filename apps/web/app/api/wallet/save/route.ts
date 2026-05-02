import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ensureMerchant } from "@/lib/merchant";
import { getDb } from "@dodonaut/db/client";
import { merchants } from "@dodonaut/db/schema";
import { eq } from "drizzle-orm";

const Body = z.object({
  // Base58 Solana address — 32–44 chars
  solanaAddress: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { solanaAddress } = parsed.data;

  // Ensure merchant row exists (lazy provision against Dodo customer).
  let merchant = await ensureMerchantSafe({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });

  if (!merchant) {
    return NextResponse.json(
      {
        error:
          "Could not provision merchant — the Dodo customer for your email " +
          "isn't visible yet. Wait a few seconds and try again.",
      },
      { status: 503 },
    );
  }

  await getDb()
    .update(merchants)
    .set({ solanaAddress, updatedAt: new Date() })
    .where(eq(merchants.id, merchant.id));

  return NextResponse.json({ ok: true, slug: merchant.slug });
}

async function ensureMerchantSafe(args: {
  userId: string;
  email: string;
  name: string;
}) {
  try {
    return await ensureMerchant(args);
  } catch (err) {
    console.error("ensureMerchant failed", err);
    return null;
  }
}

/**
 * Lazy merchant-row provisioning.
 *
 * Better-Auth creates the user row.
 * @dodopayments/better-auth creates the Dodo customer (async).
 * This helper runs on first dashboard hit and ensures a `merchants` row exists,
 * looking up the Dodo customer by email if not yet attached locally.
 */
import { getDb } from "@dodonaut/db/client";
import { merchants, type Merchant } from "@dodonaut/db/schema";
import { getDodoClient } from "@dodonaut/dodo/client";
import { eq } from "drizzle-orm";

export async function ensureMerchant(args: {
  userId: string;
  email: string;
  name: string;
}): Promise<Merchant> {
  const db = getDb();
  const existing = await db
    .select()
    .from(merchants)
    .where(eq(merchants.userId, args.userId))
    .limit(1);
  if (existing.length > 0) return existing[0]!;

  // Look up the Dodo customer the plugin should have just created.
  const dodo = getDodoClient();
  const list = await dodo.customers.list({ email: args.email });
  const dodoCustomerId = list?.items?.[0]?.customer_id;

  if (!dodoCustomerId) {
    throw new Error(
      `No Dodo customer found for email ${args.email}. ` +
        `Either the @dodopayments/better-auth plugin failed to create it on signup, ` +
        `or it is still propagating. Retry, or pass createCustomerOnSignUp=true.`,
    );
  }

  const slug = makeSlug(args.email, args.name);
  const inserted = await db
    .insert(merchants)
    .values({
      userId: args.userId,
      slug,
      dodoCustomerId,
      // Stored encrypted in production; for v1 we use the env's API key as the source of truth
      // and leave these placeholder fields filled with a marker so the typecheck passes.
      // TODO: per-merchant API key vault (post-hackathon).
      dodoApiKeyEncrypted: "shared-from-env",
      dodoWebhookKeyEncrypted: "shared-from-env",
      // solanaAddress is required NOT NULL — but we don't have it yet at first load.
      // The /onboarding/connect-wallet flow runs BEFORE first dashboard hit, so this
      // function is never called until a wallet is connected. See app/page.tsx redirect.
      solanaAddress: "",
    })
    .returning();
  return inserted[0]!;
}

function makeSlug(email: string, name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) ||
    email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
    "merchant";
  // Append a 4-char suffix to reduce collisions; we have a unique constraint anyway.
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

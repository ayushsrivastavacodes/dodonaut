import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@dodonaut/db/client";
import { merchants, products, endpoints } from "@dodonaut/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WrapProductModal } from "@/components/wrap-product-modal";
import { baseUnitsToUsdString } from "@dodonaut/shared/mints";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/signup");

  const db = getDb();
  const merchantRows = await db
    .select()
    .from(merchants)
    .where(eq(merchants.userId, session.user.id))
    .limit(1);
  const merchant = merchantRows[0];

  if (!merchant) redirect("/onboarding/connect-wallet");
  if (!merchant.solanaAddress) redirect("/onboarding/connect-wallet");

  const productRows = await db
    .select()
    .from(products)
    .where(eq(products.merchantId, merchant.id));

  const endpointRows = await db
    .select()
    .from(endpoints)
    .where(eq(endpoints.merchantId, merchant.id));

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 space-y-1">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Dashboard · {merchant.slug}
        </p>
        <h1 className="text-3xl font-medium tracking-tight">
          {session.user.name}, your Dodonaut is live
        </h1>
        <p className="text-sm text-muted-foreground">
          Dodo customer:{" "}
          <code className="font-mono text-xs">{merchant.dodoCustomerId}</code>{" "}
          · Solana wallet:{" "}
          <code className="font-mono text-xs">
            {merchant.solanaAddress.slice(0, 8)}…
            {merchant.solanaAddress.slice(-6)}
          </code>
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Products synced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium">{productRows.length}</div>
            <SyncProductsButton />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">x402 endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium">{endpointRows.length}</div>
            <p className="text-sm text-muted-foreground">
              {endpointRows.length === 0
                ? "Pick a product to wrap."
                : "Live and listening for agent calls."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Settled calls (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-medium">0</div>
            <p className="text-sm text-muted-foreground">
              Once an agent pays, it shows up here.
            </p>
          </CardContent>
        </Card>
      </div>

      {productRows.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Dodo products</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {productRows.map((p) => {
                const wrapped = endpointRows.find((e) => e.productId === p.id);
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md border px-4 py-3"
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.dodoProductId} · {p.type}
                        {wrapped && (
                          <>
                            {" · "}
                            <span className="text-green-600 dark:text-green-400">
                              wrapped @ ${baseUnitsToUsdString(wrapped.priceUsdBaseUnits)}/call
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {wrapped ? (
                      <Button size="sm" variant="ghost" disabled>
                        Live
                      </Button>
                    ) : (
                      <WrapProductModal
                        productId={p.id}
                        productName={p.name}
                        defaultPriceUsd={
                          p.priceUsdBaseUnits > 0n
                            ? baseUnitsToUsdString(p.priceUsdBaseUnits)
                            : "0.05"
                        }
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function SyncProductsButton() {
  return (
    <form action="/api/dodo/products/sync" method="post" className="mt-3">
      <Button type="submit" size="sm" variant="outline" className="w-full">
        Sync from Dodo
      </Button>
    </form>
  );
}

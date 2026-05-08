import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@dodonaut/db/client";
import { merchants, products, endpoints } from "@dodonaut/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { WrapProductModal } from "@/components/wrap-product-modal";
import { baseUnitsToUsdString } from "@dodonaut/shared/mints";
import { AppHeader } from "@/components/dashboard/app-header";
import { ArrowUpRight, Plus } from "lucide-react";

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

  const network =
    process.env.SOLANA_NETWORK === "mainnet" ? "mainnet" : "devnet";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader merchantSlug={merchant.slug} network={network} />

      <main className="mx-auto max-w-[1280px] px-6 py-12">
        {/* Greeting */}
        <div className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-2">Dashboard</p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight">
              Hello, {session.user.name?.split(" ")[0] ?? "there"}.
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Wrap a product to start accepting agent payments.
            </p>
          </div>
          <form action="/api/dodo/products/sync" method="post">
            <Button type="submit" variant="outline" size="sm">
              Sync from Dodo
            </Button>
          </form>
        </div>

        {/* Stat strip */}
        <section className="mb-10 grid grid-cols-1 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface md:grid-cols-3 md:divide-x md:divide-y-0">
          <Stat
            label="Endpoints live"
            value={String(endpointRows.length)}
            sub={
              endpointRows.length === 0
                ? "Pick a product to wrap"
                : "Listening for agent calls"
            }
          />
          <Stat
            label="Settled calls (7d)"
            value="0"
            sub="Once an agent pays, it shows up here"
          />
          <Stat
            label="Volume (7d)"
            value="$0.00"
            mono
            sub="USDC + USDG across all endpoints"
          />
        </section>

        {/* Identity card */}
        <section className="mb-10 grid gap-6 md:grid-cols-2">
          <IdentityCard
            label="Dodo customer"
            mono={merchant.dodoCustomerId}
            link={{
              href: "https://app.dodopayments.com",
              text: "Open Dodo dashboard",
            }}
          />
          <IdentityCard
            label="Solana wallet"
            mono={`${merchant.solanaAddress.slice(0, 8)}…${merchant.solanaAddress.slice(-8)}`}
            link={{
              href: `https://solscan.io/account/${merchant.solanaAddress}${network === "devnet" ? "?cluster=devnet" : ""}`,
              text: "View on Solscan",
            }}
          />
        </section>

        {/* Products */}
        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-bold tracking-tight">
              Your Dodo products
            </h2>
            <p className="font-mono text-xs text-muted-foreground">
              {productRows.length} {productRows.length === 1 ? "item" : "items"}
            </p>
          </div>

          {productRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
              <p className="text-sm text-muted-foreground">
                No products synced yet.
              </p>
              <form
                action="/api/dodo/products/sync"
                method="post"
                className="mt-4"
              >
                <Button type="submit" variant="outline" size="sm">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Sync from Dodo
                </Button>
              </form>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <ul className="divide-y divide-subtle-border">
                {productRows.map((p) => {
                  const wrapped = endpointRows.find(
                    (e) => e.productId === p.id,
                  );
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-6 py-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.name}</span>
                          {wrapped && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-success">
                              <span className="h-1 w-1 rounded-full bg-success" />
                              Live
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {p.dodoProductId} · {p.type}
                          {wrapped && (
                            <>
                              {" · "}
                              <span className="text-foreground">
                                ${baseUnitsToUsdString(wrapped.priceUsdBaseUnits)}
                                /call
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      {wrapped ? (
                        <Button size="sm" variant="ghost" asChild>
                          <a
                            href={`/dashboard/endpoint/${wrapped.id}`}
                            className="font-mono"
                          >
                            View
                            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </a>
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
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  mono = false,
}: {
  label: string;
  value: string;
  sub: string;
  mono?: boolean;
}) {
  return (
    <div className="px-6 py-6">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold tracking-tight ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function IdentityCard({
  label,
  mono,
  link,
}: {
  label: string;
  mono: string;
  link: { href: string; text: string };
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-6 py-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-all font-mono text-sm">{mono}</p>
      <a
        href={link.href}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {link.text}
        <ArrowUpRight className="h-3 w-3" />
      </a>
    </div>
  );
}

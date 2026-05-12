import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb } from "@dodonaut/db/client";
import {
  merchants,
  endpoints,
  onChainReceipts,
  products,
} from "@dodonaut/db/schema";
import { eq, desc } from "drizzle-orm";
import { AppHeader } from "@/components/dashboard/app-header";
import { baseUnitsToUsdString } from "@dodonaut/shared/mints";
import { ExternalLink } from "lucide-react";

export default async function CallsPage() {
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

  const rows = await db
    .select({
      id: onChainReceipts.id,
      signature: onChainReceipts.signature,
      agentWallet: onChainReceipts.agentWallet,
      amountBaseUnits: onChainReceipts.amountBaseUnits,
      asset: onChainReceipts.asset,
      latencyMs: onChainReceipts.endToEndLatencyMs,
      createdAt: onChainReceipts.createdAt,
      productName: products.name,
      productSlug: products.slug,
    })
    .from(onChainReceipts)
    .leftJoin(endpoints, eq(endpoints.id, onChainReceipts.endpointId))
    .leftJoin(products, eq(products.id, endpoints.productId))
    .where(eq(onChainReceipts.merchantId, merchant.id))
    .orderBy(desc(onChainReceipts.createdAt))
    .limit(100);

  const network =
    process.env.SOLANA_NETWORK === "mainnet" ? "mainnet" : "devnet";

  const totalRevenueBaseUnits = rows.reduce(
    (sum, r) => sum + (r.amountBaseUnits ?? 0n),
    0n,
  );
  const uniqueAgents = new Set(rows.map((r) => r.agentWallet)).size;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader merchantSlug={merchant.slug} network={network} />

      <main className="mx-auto max-w-[1280px] px-6 py-12">
        <div className="mb-10">
          <p className="eyebrow mb-2">Activity</p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Settled calls
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Real on-chain settlements through your endpoints, ordered by most
            recent. Click a signature to verify on Solscan.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Stat label="Settled calls" value={rows.length.toString()} />
          <Stat
            label="Revenue (USDC)"
            value={`$${baseUnitsToUsdString(totalRevenueBaseUnits)}`}
          />
          <Stat label="Unique agents" value={uniqueAgents.toString()} />
        </div>

        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-subtle-border bg-background/50 text-left">
                <tr className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3">Endpoint</th>
                  <th className="px-5 py-3">Agent</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Latency</th>
                  <th className="px-5 py-3">Signature</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-subtle-border hover:bg-background/40"
                  >
                    <td className="px-5 py-3 text-muted-foreground">
                      {timeAgo(r.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      {r.productName ?? "(deleted product)"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {r.agentWallet.slice(0, 4)}…{r.agentWallet.slice(-4)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono">
                      ${baseUnitsToUsdString(r.amountBaseUnits)}{" "}
                      <span className="text-muted-foreground">{r.asset}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-muted-foreground">
                      {r.latencyMs ? `${r.latencyMs} ms` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={`https://solscan.io/tx/${r.signature}${
                          network === "devnet" ? "?cluster=devnet" : ""
                        }`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-[var(--primary)] hover:underline"
                      >
                        {r.signature.slice(0, 8)}…{r.signature.slice(-4)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-bold leading-none tracking-tight">
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
      <p className="text-sm text-muted-foreground">
        No settled calls yet. Wrap a product on the dashboard, share the URL
        with an agent, and settled payments will appear here in real time.
      </p>
    </div>
  );
}

function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

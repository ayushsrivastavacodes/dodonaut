import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDb } from "@dodonaut/db/client";
import {
  merchants,
  endpoints,
  products,
  onChainReceipts,
} from "@dodonaut/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AppHeader } from "@/components/dashboard/app-header";
import { CopyableUrl } from "@/components/copyable-url";
import { baseUnitsToUsdString } from "@dodonaut/shared/mints";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default async function EndpointDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
      endpointId: endpoints.id,
      upstreamUrl: endpoints.upstreamUrl,
      priceUsdBaseUnits: endpoints.priceUsdBaseUnits,
      acceptedAssets: endpoints.acceptedAssets,
      enabled: endpoints.enabled,
      createdAt: endpoints.createdAt,
      productName: products.name,
      dodoProductId: products.dodoProductId,
    })
    .from(endpoints)
    .innerJoin(products, eq(products.id, endpoints.productId))
    .where(
      and(eq(endpoints.id, id), eq(endpoints.merchantId, merchant.id)),
    )
    .limit(1);
  const ep = rows[0];
  if (!ep) notFound();

  const apiBase =
    process.env.NEXT_PUBLIC_DODONAUT_API_BASE ?? "https://api.dodonaut.xyz";
  const network =
    process.env.SOLANA_NETWORK === "mainnet" ? "mainnet" : "devnet";
  const x402Url = `${apiBase}/m/${merchant.slug}/p/${ep.dodoProductId}`;
  const price = baseUnitsToUsdString(ep.priceUsdBaseUnits);

  const recent = await db
    .select({
      signature: onChainReceipts.signature,
      agentWallet: onChainReceipts.agentWallet,
      amountBaseUnits: onChainReceipts.amountBaseUnits,
      latencyMs: onChainReceipts.endToEndLatencyMs,
      createdAt: onChainReceipts.createdAt,
    })
    .from(onChainReceipts)
    .where(eq(onChainReceipts.endpointId, ep.endpointId))
    .orderBy(desc(onChainReceipts.createdAt))
    .limit(10);

  const curlSnippet = `# Probe — expect 402
curl -i ${x402Url}

# Sign + retry via @x402/fetch (any agent SDK works)
ENDPOINT_URL="${x402Url}" \\
AGENT_KEYPAIR_FILE=~/.config/solana/agent.json \\
SOLANA_NETWORK=mainnet \\
  bun apps/edge/scripts/agent-call.ts`;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader merchantSlug={merchant.slug} network={network} />

      <main className="mx-auto max-w-[1100px] px-6 py-12">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>

        <div className="mb-10">
          <p className="eyebrow mb-2">x402 endpoint</p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">
            {ep.productName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ${price} per call · settles in USDC on Solana {network} · upstream{" "}
            <a
              href={ep.upstreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline-offset-2 hover:underline"
            >
              {ep.upstreamUrl}
            </a>
          </p>
        </div>

        <section className="mb-8 rounded-xl border border-border bg-surface p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Endpoint URL
          </p>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Paste into any AI agent's tool list, your docs, or curl. The first
            call returns 402 with payment requirements; the second (signed) call
            returns the proxied upstream response.
          </p>
          <CopyableUrl value={x402Url} />
        </section>

        <section className="mb-8 rounded-xl border border-border bg-surface p-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Try it
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-subtle-border bg-background p-4 font-mono text-xs leading-relaxed">
{curlSnippet}
          </pre>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Recent settlements
            </p>
            <Link
              href="/dashboard/calls"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              See all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No settlements yet. Hit the URL above with a funded agent wallet
              and you'll see the receipt land here in real time.
            </p>
          ) : (
            <ul className="space-y-2">
              {recent.map((r) => (
                <li
                  key={r.signature}
                  className="flex items-center justify-between gap-4 rounded-md border border-subtle-border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {timeAgo(r.createdAt)}
                  </span>
                  <span className="font-mono text-xs">
                    {r.agentWallet.slice(0, 4)}…{r.agentWallet.slice(-4)}
                  </span>
                  <span className="font-mono">
                    ${baseUnitsToUsdString(r.amountBaseUnits)} USDC
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {r.latencyMs ? `${r.latencyMs}ms` : "—"}
                  </span>
                  <a
                    href={`https://solscan.io/tx/${r.signature}${
                      network === "devnet" ? "?cluster=devnet" : ""
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-[var(--primary)] hover:underline"
                  >
                    {r.signature.slice(0, 8)}…
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
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

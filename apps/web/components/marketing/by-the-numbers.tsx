/**
 * "By the numbers" section — server component.
 *
 * Fetches REAL settlement data from on_chain_receipts (no mocking).
 * If the table is empty, the live activity card renders an empty state
 * rather than fabricating rows.
 *
 * Layout: 4-cell asymmetric bento grid (3 stat cells + 1 live activity feed
 * spanning two rows on the right).
 *
 * Public-page privacy: merchant slugs and agent wallets are truncated for
 * public display so individual users aren't deanonymized.
 */
import { NumberTicker } from "@/components/ui/number-ticker";
import { LiveActivityFeed } from "./live-activity-feed";
import type { SettlementRowData } from "./live-settlement-row";
import { getDb } from "@dodonaut/db/client";
import { merchants, onChainReceipts } from "@dodonaut/db/schema";
import { eq, desc } from "drizzle-orm";
import { baseUnitsToUsdString } from "@dodonaut/shared/mints";

export async function ByTheNumbers() {
  const settlements = await fetchRecentSettlements();

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-28">
        <div className="mb-12 flex items-end justify-between gap-8 border-b border-border pb-6">
          <div>
            <p className="eyebrow mb-2">By the numbers</p>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
              The fast path from agent call to your Dodo dashboard.
            </h2>
          </div>
          <p className="hidden max-w-xs text-sm text-muted-foreground md:block">
            Measured against Solana mainnet + the Coinbase CDP x402
            facilitator, settling in USDC. Live activity reflects real
            on-chain settlements.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[180px]">
          <StatCard
            className="md:col-span-2 md:row-span-1"
            eyebrow="Time to first endpoint"
            metric={
              <span className="flex items-baseline">
                <NumberTicker
                  value={90}
                  className="font-mono text-[var(--primary)]"
                />
                <span className="ml-1 font-mono text-3xl text-muted-foreground/70">
                  s
                </span>
              </span>
            }
            body="Cold-start a Google account, connect Phantom, paste a Dodo product ID, copy the x402 URL."
          />

          {/* Tall right card: real live activity feed (or empty state) */}
          <div className="row-span-2 flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-subtle-border px-5 py-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Live activity
              </p>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${settlements.length > 0 ? "animate-pulse bg-success" : "bg-stone-300"}`}
                />
                <span
                  className={
                    settlements.length > 0
                      ? "text-success"
                      : "text-muted-foreground"
                  }
                >
                  {settlements.length > 0 ? "Streaming" : "Idle"}
                </span>
              </span>
            </div>
            <LiveActivityFeed settlements={settlements} />
          </div>

          <StatCard
            eyebrow="Settlement latency"
            metric={
              <span className="flex items-baseline">
                <span className="font-mono text-3xl text-muted-foreground/70">
                  &lt;
                </span>
                <NumberTicker
                  value={900}
                  className="font-mono text-[var(--primary)]"
                />
                <span className="ml-1 font-mono text-3xl text-muted-foreground/70">
                  ms
                </span>
              </span>
            }
            body="Solana finality + facilitator + proxy."
            compact
          />

          <StatCard
            eyebrow="Per-call infra cost"
            metric={
              <span className="flex items-baseline">
                <span className="font-mono text-3xl text-muted-foreground/70">
                  $
                </span>
                <NumberTicker
                  value={0.001}
                  decimalPlaces={3}
                  className="font-mono text-[var(--primary)]"
                />
              </span>
            }
            body="Coinbase CDP fee after first 1,000 calls/mo."
            compact
          />
        </div>
      </div>
    </section>
  );
}

/**
 * Pull the 12 most-recent confirmed settlements across all merchants.
 * Returns lightly-anonymized data suitable for a public marketing page —
 * no full wallet addresses, no full merchant slugs.
 */
async function fetchRecentSettlements(): Promise<SettlementRowData[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: onChainReceipts.id,
        slug: merchants.slug,
        amountBaseUnits: onChainReceipts.amountBaseUnits,
        asset: onChainReceipts.asset,
        agentWallet: onChainReceipts.agentWallet,
        latencyMs: onChainReceipts.endToEndLatencyMs,
        createdAt: onChainReceipts.createdAt,
      })
      .from(onChainReceipts)
      .innerJoin(merchants, eq(merchants.id, onChainReceipts.merchantId))
      .orderBy(desc(onChainReceipts.createdAt))
      .limit(12);

    return rows.map((r) => ({
      id: r.id,
      merchant: anonymizeSlug(r.slug),
      amount: baseUnitsToUsdString(r.amountBaseUnits),
      // pgEnum settlement_asset still allows 'USDG' historically; coerce.
      asset: "USDC" as const,
      ms: r.latencyMs ?? 0,
      agent: anonymizeWallet(r.agentWallet),
    }));
  } catch (err) {
    console.warn("fetchRecentSettlements failed (returning empty):", err);
    return [];
  }
}

function anonymizeSlug(slug: string): string {
  if (!slug) return "•••";
  // First 3 chars + 3 dots, e.g. "sci•••". Public landing — protect users.
  return `${slug.slice(0, 3)}•••`;
}

function anonymizeWallet(addr: string): string {
  if (!addr || addr.length < 8) return "AGT•••";
  return `${addr.slice(0, 4)}…${addr.slice(-3)}`;
}

function StatCard({
  eyebrow,
  metric,
  body,
  className = "",
  compact = false,
}: {
  eyebrow: string;
  metric: React.ReactNode;
  body: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface p-6 ${className}`}
    >
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {eyebrow}
      </p>
      <div
        className={`my-3 leading-none tracking-tight ${compact ? "text-5xl" : "text-7xl"}`}
      >
        {metric}
      </div>
      <p
        className={`text-muted-foreground ${compact ? "text-xs" : "max-w-md text-sm leading-relaxed"}`}
      >
        {body}
      </p>
    </div>
  );
}

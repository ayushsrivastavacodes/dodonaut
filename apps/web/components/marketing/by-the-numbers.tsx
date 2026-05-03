"use client";

/**
 * "By the numbers" section.
 *
 * Composed entirely from real component-library primitives:
 *   - Magic UI NumberTicker  → count-up animation on viewport entry
 *   - Magic UI AnimatedList  → spring-based feed of mock settlements
 *
 * Layout: 4-cell asymmetric bento grid (3 stat cells + 1 live activity feed
 * spanning two rows on the right). Says "this is a live financial product."
 */
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedList } from "@/components/ui/animated-list";
import {
  LiveSettlementRow,
  type SettlementRowData,
} from "./live-settlement-row";
import { useMemo } from "react";

const MOCK_SETTLEMENTS: SettlementRowData[] = [
  { id: "1", merchant: "scira-rewrite",   amount: "0.050", asset: "USDG", ms: 712, agent: "AGTabc…1q9" },
  { id: "2", merchant: "resumedogs-tailor", amount: "0.012", asset: "USDC", ms: 684, agent: "AGTjkl…m44" },
  { id: "3", merchant: "bundled-export",  amount: "0.075", asset: "USDG", ms: 821, agent: "AGTpqr…7zz" },
  { id: "4", merchant: "khichdi-lex",     amount: "0.020", asset: "USDC", ms: 593, agent: "AGTuvw…xy2" },
  { id: "5", merchant: "mcpify-deploy",   amount: "0.150", asset: "USDG", ms: 760, agent: "AGTvbn…m1k" },
  { id: "6", merchant: "scira-rewrite",   amount: "0.050", asset: "USDG", ms: 642, agent: "AGTqaz…wsx" },
  { id: "7", merchant: "bundled-export",  amount: "0.075", asset: "USDG", ms: 715, agent: "AGTedc…rfv" },
  { id: "8", merchant: "khichdi-lex",     amount: "0.020", asset: "USDC", ms: 698, agent: "AGTtgb…yhn" },
];

export function ByTheNumbers() {
  const settlements = useMemo(() => MOCK_SETTLEMENTS, []);

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-28">
        {/* Section header */}
        <div className="mb-12 flex items-end justify-between gap-8 border-b border-border pb-6">
          <div>
            <p className="eyebrow mb-2">By the numbers</p>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
              The fast path from agent call to your Dodo dashboard.
            </h2>
          </div>
          <p className="hidden max-w-xs text-sm text-muted-foreground md:block">
            Measured against Solana mainnet + the Coinbase CDP x402 facilitator,
            May 2026.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[180px]">
          {/* CARD 1 — wide: time to first endpoint */}
          <StatCard
            className="md:col-span-2 md:row-span-1"
            eyebrow="Time to first endpoint"
            metric={
              <span className="flex items-baseline">
                <NumberTicker
                  value={90}
                  className="font-mono text-[var(--primary)]"
                />
                <span className="ml-1 font-mono text-3xl text-muted-foreground/60">
                  s
                </span>
              </span>
            }
            body="Cold-start a Google account, connect Phantom, paste a Dodo product ID, copy the x402 URL. Median across our 5 design partners."
          />

          {/* CARD 2 — tall right-side: live settlements feed (spans both rows) */}
          <div className="row-span-2 flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-subtle-border px-5 py-3">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Live activity · devnet
              </p>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Streaming
              </span>
            </div>
            <div className="relative flex-1 overflow-hidden p-3">
              <AnimatedList delay={1500} className="space-y-2">
                {settlements.map((s) => (
                  <LiveSettlementRow key={s.id} data={s} />
                ))}
              </AnimatedList>
              {/* fade-out gradient on the bottom for the scroll edge */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent" />
            </div>
          </div>

          {/* CARD 3 — settlement latency */}
          <StatCard
            eyebrow="Settlement latency"
            metric={
              <span className="flex items-baseline">
                <span className="font-mono text-3xl text-muted-foreground/60">
                  &lt;
                </span>
                <NumberTicker
                  value={900}
                  className="font-mono text-[var(--primary)]"
                />
                <span className="ml-1 font-mono text-3xl text-muted-foreground/60">
                  ms
                </span>
              </span>
            }
            body="Solana finality + facilitator + proxy."
            compact
          />

          {/* CARD 4 — per-call cost */}
          <StatCard
            eyebrow="Per-call infra cost"
            metric={
              <span className="flex items-baseline">
                <span className="font-mono text-3xl text-muted-foreground/60">
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

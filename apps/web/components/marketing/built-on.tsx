"use client";

/**
 * "Built on" trust strip — uses Magic UI Marquee.
 * Mono partner names scrolling slowly. No logos, no brand colors.
 */
import { Marquee } from "@/components/ui/marquee";

const PARTNERS = [
  "Dodo Payments",
  "Solana",
  "USDG · Paxos",
  "x402 Foundation",
  "Coinbase CDP",
  "Helius",
  "Better-Auth",
  "Drizzle",
  "Neon Postgres",
];

export function BuiltOn() {
  return (
    <section className="border-b border-border bg-background py-12">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="eyebrow mb-6 text-center">
          Built on the modern Solana payments stack
        </p>
        <div className="relative overflow-hidden">
          <Marquee className="[--duration:50s]" pauseOnHover>
            {PARTNERS.map((p) => (
              <span
                key={p}
                className="mx-4 text-base font-medium text-muted-foreground"
              >
                {p}
              </span>
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
        </div>
      </div>
    </section>
  );
}

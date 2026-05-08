"use client";

/**
 * Client-side animated list. Receives settlement data from a server component
 * (no fabrication anywhere — empty array → empty state).
 */
import { AnimatedList } from "@/components/ui/animated-list";
import {
  LiveSettlementRow,
  type SettlementRowData,
} from "./live-settlement-row";

export function LiveActivityFeed({
  settlements,
}: {
  settlements: SettlementRowData[];
}) {
  if (settlements.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          Awaiting first call
        </p>
        <p className="max-w-[28ch] text-sm leading-relaxed text-muted-foreground">
          The first agent payment will stream here as soon as a wrapped
          endpoint settles.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden p-3">
      <AnimatedList delay={1500} className="space-y-2">
        {settlements.map((s) => (
          <LiveSettlementRow key={s.id} data={s} />
        ))}
      </AnimatedList>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent" />
    </div>
  );
}

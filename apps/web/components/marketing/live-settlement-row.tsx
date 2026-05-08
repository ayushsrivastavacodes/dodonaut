/**
 * Single row inside the AnimatedList — looks like a Stripe/Mercury feed entry.
 * Mono typography, hairline border, subtle status dot. No icons, no gradients.
 */
import { ArrowDownRight } from "lucide-react";

export interface SettlementRowData {
  id: string;
  merchant: string;
  amount: string; // already formatted, e.g. "0.05"
  asset: "USDC";
  ms: number;
  agent: string; // truncated agent wallet
}

export function LiveSettlementRow({ data }: { data: SettlementRowData }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
        <ArrowDownRight className="h-3.5 w-3.5 text-success" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[13px] font-medium leading-tight">
            {data.merchant}
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">
            ←
          </span>
          <p className="truncate font-mono text-[10.5px] text-muted-foreground">
            {data.agent}
          </p>
        </div>
        <p className="mt-0.5 font-mono text-[10.5px] text-muted-foreground">
          settled in {data.ms}ms
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[13px] font-medium text-foreground tabular-nums">
          ${data.amount}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {data.asset}
        </p>
      </div>
    </div>
  );
}

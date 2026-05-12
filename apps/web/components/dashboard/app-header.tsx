import Link from "next/link";
import { Wordmark } from "@/components/marketing/wordmark";

export function AppHeader({
  merchantSlug,
  network = "devnet",
}: {
  merchantSlug: string;
  network?: "devnet" | "mainnet";
}) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Wordmark className="h-6 w-6 text-foreground" />
            <span className="font-display text-lg font-bold tracking-tight">
              Dodonaut
            </span>
          </Link>
          <span className="hidden h-5 w-px bg-border md:block" />
          <p className="hidden font-mono text-xs text-muted-foreground md:block">
            {merchantSlug}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NetworkPill network={network} />
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <Link className="hover:text-foreground" href="/dashboard">
              Endpoints
            </Link>
            <Link className="hover:text-foreground" href="/dashboard/calls">
              Calls
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function NetworkPill({ network }: { network: "devnet" | "mainnet" }) {
  const isMainnet = network === "mainnet";
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1">
      <span
        className={`h-1.5 w-1.5 rounded-full ${isMainnet ? "bg-success" : "bg-amber-500"}`}
      />
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        {network}
      </span>
    </div>
  );
}

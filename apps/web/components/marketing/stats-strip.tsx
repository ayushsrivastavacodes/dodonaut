const stats = [
  {
    metric: "90s",
    label: "From sign-in to a paste-able x402 URL",
  },
  {
    metric: "<900ms",
    label: "Agent settlement latency on Solana",
  },
  {
    metric: "$0.001",
    label: "Coinbase facilitator fee per call",
  },
];

export function StatsStrip() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
        {stats.map((s) => (
          <div key={s.metric} className="px-6 py-16 md:px-10">
            <div className="font-mono text-5xl tracking-tight text-primary">
              {s.metric}
            </div>
            <p className="mt-3 max-w-[18ch] text-sm leading-relaxed text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

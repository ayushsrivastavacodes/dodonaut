const partners = [
  "Dodo Payments",
  "Solana",
  "USDG",
  "x402",
  "Coinbase CDP",
];

export function BuiltOn() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <p className="eyebrow">Built on</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-muted-foreground">
            {partners.map((p) => (
              <span key={p} className="font-medium">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

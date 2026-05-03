const steps = [
  {
    n: "01",
    title: "Connect Dodo + Solana wallet",
    body: "Sign in with Google. We auto-create your Dodo customer and connect Phantom or Solflare via Wallet Standard.",
  },
  {
    n: "02",
    title: "Wrap any Dodo product",
    body: "Paste your upstream URL and a per-call price. We provision a Dodo meter and return a copy-pasteable x402 URL.",
  },
  {
    n: "03",
    title: "Agents pay per call",
    body: "Each settled call hits your Dodo usage meter. Your payouts, GST, and MoR stay exactly where they are — inside Dodo.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-32">
        <div className="mb-16 max-w-2xl">
          <p className="eyebrow mb-4">How it works</p>
          <h2 className="text-3xl tracking-tight sm:text-4xl">
            Three steps from sign-in to a wrapped endpoint your AI agents can
            pay for.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="bg-surface p-8 lg:p-10">
              <div className="font-mono text-xs tracking-widest text-primary">
                {s.n}
              </div>
              <h3 className="mt-4 text-xl font-semibold leading-snug">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

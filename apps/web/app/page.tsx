export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <div className="space-y-6">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Dodonaut · v0.0 · Day 1
        </p>
        <h1 className="text-5xl font-medium tracking-tight">
          The agent rail for Dodo Payments.
        </h1>
        <p className="text-lg text-muted-foreground">
          Paste a Dodo product ID. Get an x402-protected URL. AI agents pay per call
          in USDG on Solana. Settlements land in your existing Dodo dashboard —
          your billing, payouts, MoR, and GST stay 100% with Dodo.
        </p>
        <div className="flex gap-4 pt-4">
          <a
            href="/signup"
            className="rounded-md bg-primary px-5 py-2.5 text-primary-foreground hover:opacity-90"
          >
            Get started
          </a>
          <a
            href="https://github.com/dodonaut/dodonaut"
            className="rounded-md border px-5 py-2.5 hover:bg-secondary"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </main>
  );
}

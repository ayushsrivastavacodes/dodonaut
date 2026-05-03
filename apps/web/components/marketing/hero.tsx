import { ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          {/* Left: copy */}
          <div className="space-y-8">
            <p className="eyebrow">Dodonaut · v0.1 · Mainnet ready</p>
            <h1 className="text-5xl leading-[1.05] tracking-tighter sm:text-6xl lg:text-[68px]">
              The agent rail for{" "}
              <span className="text-primary">Dodo Payments</span>.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Paste a Dodo product ID. Get an x402-protected URL. AI agents pay
              per call in <span className="font-mono text-foreground">USDG</span>{" "}
              on Solana. Settlements land in your existing Dodo dashboard — your
              billing, payouts, MoR, and GST stay 100% with Dodo.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Get started
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a
                  href="https://github.com/ayushsrivastavacodes/dodonaut"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Github className="mr-1.5 h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>

          {/* Right: code snippet card */}
          <div className="relative">
            <div className="absolute inset-0 -translate-x-2 translate-y-2 rounded-xl border border-border" />
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-subtle-border bg-background px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
                  <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  agent-call.ts
                </span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed text-foreground">
                <code>{`import { wrapFetchWithPayment } from "@x402/fetch";
import { ExactSvmSchemeV1 } from "@x402/svm/client";

const fetchPaid = wrapFetchWithPayment(fetch, signer);

// $0.05 USDG per call. Settles in <900ms on Solana.
const res = await fetchPaid(
  "https://api.dodonaut.xyz/m/aman/p/pdt_resume"
);
console.log(await res.json());`}</code>
              </pre>
              <div className="flex items-center justify-between border-t border-subtle-border bg-background px-4 py-2 font-mono text-[11px] text-muted-foreground">
                <span>HTTP 402 → settled → 200</span>
                <span className="text-success">●&nbsp;712 ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

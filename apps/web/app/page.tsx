import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  // If already signed in, jump straight to dashboard.
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) redirect("/dashboard");
  } catch {
    // Auth not configured locally yet — render marketing page.
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <div className="space-y-6">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Dodonaut · v0.0
        </p>
        <h1 className="text-5xl font-medium tracking-tight">
          The agent rail for Dodo Payments.
        </h1>
        <p className="text-lg text-muted-foreground">
          Paste a Dodo product ID. Get an x402-protected URL. AI agents pay per
          call in USDG on Solana. Settlements land in your existing Dodo
          dashboard — your billing, payouts, MoR, and GST stay 100% with Dodo.
        </p>
        <div className="flex flex-wrap gap-3 pt-4">
          <Button asChild size="lg">
            <a href="/signup">Get started</a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="https://github.com/dodonaut/dodonaut">View on GitHub</a>
          </Button>
        </div>
        <div className="grid gap-4 pt-12 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-widest text-foreground">
              90 sec
            </div>
            <p>
              From sign-in to a paste-able x402 URL. No new dashboard to learn.
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-widest text-foreground">
              USDG · Solana
            </div>
            <p>
              Featured settlement asset. Sub-second finality, sub-cent fees.
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-widest text-foreground">
              Dodo-native
            </div>
            <p>
              Each call lands as a Usage Event in your meter. MoR, GST, payouts
              all stay with Dodo.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { AuthShell } from "@/components/marketing/auth-shell";
import { GoogleIcon } from "@/components/marketing/google-icon";

export default function SignupPage() {
  const [pending, setPending] = useState(false);

  async function signInGoogle() {
    setPending(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/onboarding/connect-wallet",
        errorCallbackURL: "/signup?error=oauth",
      });
    } catch (err) {
      console.error(err);
      toast.error("Sign-in failed. Try again.");
      setPending(false);
    }
  }

  return (
    <AuthShell
      step={1}
      totalSteps={2}
      eyebrow="Sign in · 90 seconds to your first endpoint"
      asideTitle="Built for Indian SaaS founders shipping AI products globally."
      asideBody="Sign in with Google. We auto-create your Dodo Payments customer and you're a wallet connect away from accepting agent payments in USDC on Solana."
      asideMetric={{
        value: "<900ms",
        label: "Median agent settlement: Solana finality + x402 facilitator + upstream proxy",
      }}
    >
      <h1 className="text-4xl font-bold leading-tight tracking-tight">
        Sign in to Dodonaut
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        We&apos;ll provision your Dodo customer + meter automatically. Your
        existing Dodo workspace stays intact.
      </p>

      <div className="mt-10 space-y-3">
        <Button
          onClick={signInGoogle}
          disabled={pending}
          size="lg"
          variant="outline"
          className="w-full justify-center"
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          {pending ? "Redirecting…" : "Continue with Google"}
        </Button>
      </div>

      <div className="mt-10 space-y-2 border-t border-subtle-border pt-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          What happens next
        </p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-mono text-primary">01</span>
            <span>Sign in with Google → Dodo customer auto-created</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-primary">02</span>
            <span>Connect Phantom or Solflare via Wallet Standard</span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-primary">03</span>
            <span>Wrap your first product → copy x402 URL</span>
          </li>
        </ul>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">
        MIT licensed. Open source at{" "}
        <a
          href="https://github.com/ayushsrivastavacodes/dodonaut"
          className="text-foreground underline-offset-4 hover:underline"
        >
          github.com/ayushsrivastavacodes/dodonaut
        </a>
        .
      </p>
    </AuthShell>
  );
}

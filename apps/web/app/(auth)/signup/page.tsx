"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-3xl tracking-tight">
            Sign in to Dodonaut
          </CardTitle>
          <CardDescription>
            We&apos;ll create your Dodo customer and connect your Solana wallet
            in 90 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={signInGoogle}
            disabled={pending}
            className="w-full"
            size="lg"
          >
            {pending ? "Redirecting…" : "Continue with Google"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            By continuing you agree to our terms (TBD — we&apos;re a hackathon
            project, MIT-licensed at{" "}
            <a
              href="https://github.com/dodonaut/dodonaut"
              className="underline hover:text-foreground"
            >
              github.com/dodonaut/dodonaut
            </a>
            ).
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

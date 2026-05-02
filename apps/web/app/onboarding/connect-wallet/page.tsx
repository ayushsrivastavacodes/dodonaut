"use client";

/**
 * Onboarding step 2: connect a Solana wallet via framework-kit Wallet Standard discovery.
 *
 * Uses @solana/react-hooks `useWalletConnection()` per the solana-dev skill.
 * Persists the chosen wallet's pubkey via /api/wallet/save.
 */
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useWalletConnection } from "@solana/react-hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export default function ConnectWalletPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const {
    connectors,
    connect,
    disconnect,
    connected,
    connecting,
    isReady,
    wallet,
    error,
  } = useWalletConnection();
  const [saving, startSave] = useTransition();

  // Redirect to /signup if no session.
  useEffect(() => {
    if (!sessionPending && !session) router.replace("/signup");
  }, [session, sessionPending, router]);

  // Surface wallet errors as toasts.
  useEffect(() => {
    if (error) {
      const msg =
        error instanceof Error ? error.message : String(error ?? "Wallet error");
      toast.error(msg);
    }
  }, [error]);

  function handleConnect(connectorId: string) {
    connect(connectorId).catch((err: unknown) => {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Wallet connection failed",
      );
    });
  }

  function handleSave() {
    const address = wallet?.account?.address;
    if (!address) return;
    startSave(async () => {
      try {
        const res = await fetch("/api/wallet/save", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ solanaAddress: String(address) }),
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Wallet connected. Loading your products…");
        router.replace("/dashboard");
      } catch (err) {
        console.error(err);
        toast.error(
          err instanceof Error ? err.message : "Could not save wallet",
        );
      }
    });
  }

  if (sessionPending || !isReady) {
    return <CenterCard title="Loading…" />;
  }

  const address = wallet?.account?.address ? String(wallet.account.address) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight">
            Connect your Solana wallet
          </CardTitle>
          <CardDescription>
            This is the wallet your agent payments will settle to. We never
            custody — Dodonaut only watches the address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected && address ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-secondary/40 px-3 py-2 font-mono text-sm break-all">
                {address}
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Use this wallet"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => disconnect()}
                disabled={saving}
              >
                Disconnect & pick another
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {connectors.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No Wallet-Standard wallets detected. Install{" "}
                  <a
                    className="underline"
                    href="https://phantom.com/download"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Phantom
                  </a>{" "}
                  or{" "}
                  <a
                    className="underline"
                    href="https://solflare.com/download"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Solflare
                  </a>{" "}
                  and reload.
                </p>
              ) : (
                connectors.map((c) => (
                  <Button
                    key={c.id}
                    onClick={() => handleConnect(c.id)}
                    variant="outline"
                    disabled={connecting}
                    className="w-full justify-start"
                  >
                    {c.icon && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.icon}
                        alt={c.name}
                        className="mr-2 h-5 w-5"
                      />
                    )}
                    {c.name}
                  </Button>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function CenterCard({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      </Card>
    </main>
  );
}

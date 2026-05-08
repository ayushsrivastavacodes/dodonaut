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
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { AuthShell } from "@/components/marketing/auth-shell";
import { Check, ExternalLink } from "lucide-react";

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

  useEffect(() => {
    if (!sessionPending && !session) router.replace("/signup");
  }, [session, sessionPending, router]);

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

  const address = wallet?.account?.address ? String(wallet.account.address) : null;

  return (
    <AuthShell
      step={2}
      totalSteps={2}
      eyebrow="Connect wallet · Non-custodial"
      asideTitle="Your wallet, your money. Dodonaut never touches it."
      asideBody="We watch your address for incoming USDC (and USDG) settlements. The agent's payment goes directly to you on-chain — Dodonaut is the paywall, not the custodian."
      asideMetric={{
        value: "<400ms",
        label: "Solana finality. Settlements clear before the HTTP timeout.",
      }}
    >
      <h1 className="text-4xl font-bold leading-tight tracking-tight">
        Connect your Solana wallet
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        Pick a Wallet-Standard wallet you have installed. We persist only the
        public address.
      </p>

      <div className="mt-10">
        {sessionPending || !isReady ? (
          <div className="rounded-lg border border-subtle-border bg-surface p-6 text-sm text-muted-foreground">
            Loading wallet adapters…
          </div>
        ) : connected && address ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                Selected wallet
              </p>
              <p className="mt-2 break-all font-mono text-sm leading-relaxed text-foreground">
                {address}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-success">
                <Check className="h-3.5 w-3.5" />
                Connected
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Use this wallet & continue"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => disconnect()}
              disabled={saving}
            >
              Disconnect & pick another
            </Button>
          </div>
        ) : connectors.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="text-sm text-muted-foreground">
              No Wallet-Standard wallets detected in this browser. Install one
              of these and reload the page:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href="https://phantom.com/download"
                  target="_blank"
                  rel="noreferrer"
                >
                  Phantom
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a
                  href="https://solflare.com/download"
                  target="_blank"
                  rel="noreferrer"
                >
                  Solflare
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a
                  href="https://backpack.app/download"
                  target="_blank"
                  rel="noreferrer"
                >
                  Backpack
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {connectors.map((c) => (
              <button
                key={c.id}
                onClick={() => handleConnect(c.id)}
                disabled={connecting}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-surface px-5 py-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  {c.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.icon}
                      alt={c.name}
                      className="h-7 w-7 rounded"
                    />
                  ) : (
                    <span className="h-7 w-7 rounded bg-muted" />
                  )}
                  <span className="font-medium">{c.name}</span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {connecting ? "connecting…" : "connect →"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-10 border-t border-subtle-border pt-6 text-xs text-muted-foreground">
        We never request signing or read private keys. We only watch the public
        address for incoming SPL transfers.
      </p>
    </AuthShell>
  );
}

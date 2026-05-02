"use client";

/**
 * Solana provider via framework-kit (per solana-dev skill).
 *
 * SolanaProvider with a `config` prop manages the client lifecycle internally
 * and handles SSR-safe wallet discovery via the WalletPersistence/registry layer.
 * walletConnectors: 'default' enables Wallet Standard auto-discovery (Phantom,
 * Solflare, Backpack, etc. that are installed in the user's browser).
 */
import React from "react";
import { SolanaProvider } from "@solana/react-hooks";
import { Toaster } from "@/components/ui/sonner";

const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProvider
      config={{
        endpoint,
        walletConnectors: "default",
      }}
      walletPersistence={{ autoConnect: true, storageKey: "dodonaut.wallet" }}
    >
      {children}
      <Toaster />
    </SolanaProvider>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dodonaut — Per-call AI agent payments for Dodo merchants",
  description:
    "One-button wrapper that turns any Dodo Payments product into an x402-protected URL. AI agents pay per call in USDG on Solana. Settles into your existing Dodo dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

interface Props {
  productId: string;
  productName: string;
  defaultPriceUsd?: string;
}

export function WrapProductModal({
  productId,
  productName,
  defaultPriceUsd = "0.05",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [upstreamUrl, setUpstreamUrl] = useState("");
  const [priceUsd, setPriceUsd] = useState(defaultPriceUsd);
  const [result, setResult] = useState<{
    url: string;
    snippet: string;
    endpointId: string;
  } | null>(null);
  const [copied, setCopied] = useState<"url" | "snippet" | null>(null);

  async function submit() {
    setPending(true);
    try {
      const res = await fetch(`/api/products/${productId}/wrap`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ upstreamUrl, priceUsd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "wrap failed");
      setResult({
        url: data.url,
        snippet: data.snippet,
        endpointId: data.endpointId,
      });
      toast.success("x402 endpoint generated");
      // NOTE: do NOT router.refresh() here — refreshing the dashboard
      // unmounts this modal because the product moves from "unwrapped" to
      // "wrapped" in the server-rendered list. Refresh on Done instead.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not wrap");
    } finally {
      setPending(false);
    }
  }

  function copyToClipboard(text: string, which: "url" | "snippet") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function reset() {
    const hadResult = result !== null;
    setOpen(false);
    setTimeout(() => {
      setResult(null);
      setUpstreamUrl("");
      setPriceUsd(defaultPriceUsd);
      if (hadResult) router.refresh();
    }, 300);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !pending) reset();
        else setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Make x402 endpoint
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Endpoint live</DialogTitle>
              <DialogDescription>
                Paste this URL into your MCP server or wherever your AI agent
                callers reach. Each call ticks your Dodo meter.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  x402 URL
                </Label>
                <div className="flex gap-2">
                  <code className="flex-1 truncate rounded-md border bg-secondary/40 px-3 py-2 font-mono text-xs">
                    {result.url}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(result.url, "url")}
                  >
                    {copied === "url" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Agent snippet (TypeScript)
                </Label>
                <div className="relative">
                  <pre className="max-h-48 overflow-auto rounded-md border bg-secondary/40 p-3 font-mono text-xs leading-relaxed">
                    {result.snippet}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute right-2 top-2"
                    onClick={() => copyToClipboard(result.snippet, "snippet")}
                  >
                    {copied === "snippet" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={reset}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Wrap “{productName}” as x402</DialogTitle>
              <DialogDescription>
                Agents call your URL → pay USDC on Solana → Dodonaut proxies
                to your upstream → each settled call lands in your Dodo meter.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="upstream">Upstream URL</Label>
                <Input
                  id="upstream"
                  placeholder="https://your-saas.com/api/your-endpoint"
                  value={upstreamUrl}
                  onChange={(e) => setUpstreamUrl(e.target.value)}
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  After payment we proxy the agent&apos;s exact request here.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price per call (USD)</Label>
                <Input
                  id="price"
                  inputMode="decimal"
                  placeholder="0.05"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  Settles in USDC on Solana. Solana mainnet finality &lt;400ms,
                  network fee paid by the agent.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset} disabled={pending}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={pending || !upstreamUrl || !priceUsd}
              >
                {pending ? "Generating…" : "Generate URL"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

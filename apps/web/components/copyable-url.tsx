"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyableUrl({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-md border border-subtle-border bg-background p-3">
      <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-foreground">
        {value}
      </code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          });
        }}
        className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium hover:bg-background"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-success" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy
          </>
        )}
      </button>
    </div>
  );
}

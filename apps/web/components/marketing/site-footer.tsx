import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Wordmark className="h-6 w-6 text-foreground" />
              <span className="font-display text-lg font-bold tracking-tight">
                Dodonaut
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              The agent rail for Dodo Payments. Per-call AI-agent payments on
              Solana, settled in USDC, ships into your existing Dodo dashboard.
            </p>
            <p className="mt-6 font-mono text-xs text-muted-foreground">
              © 2026 Dodonaut
            </p>
          </div>
          <FooterCol
            heading="Product"
            links={[
              ["Docs", "https://docs.dodonaut.xyz"],
              ["GitHub", "https://github.com/ayushsrivastavacodes/dodonaut"],
              ["Pricing", "#pricing"],
              ["Changelog", "#changelog"],
            ]}
          />
          <FooterCol
            heading="Company"
            links={[
              ["About", "#about"],
              ["X / Twitter", "https://x.com/dodonaut_xyz"],
              ["Discord", "#discord"],
              ["Contact", "mailto:hello@dodonaut.xyz"],
            ]}
          />
        </div>
        <div className="mt-12 border-t border-subtle-border pt-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Built solo for the Solana Frontier hackathon · May 2026
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: [string, string][];
}) {
  return (
    <div>
      <p className="eyebrow">{heading}</p>
      <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        {links.map(([label, href]) => (
          <li key={label}>
            <a className="hover:text-foreground" href={href}>
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

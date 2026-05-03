import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wordmark } from "./wordmark";

export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <Wordmark className="h-6 w-6 text-foreground" />
          <span className="font-display text-lg font-bold tracking-tight">
            Dodonaut
          </span>
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a className="hover:text-foreground" href="#how-it-works">
            How it works
          </a>
          <a className="hover:text-foreground" href="#pricing">
            Pricing
          </a>
          <a
            className="hover:text-foreground"
            href="https://github.com/ayushsrivastavacodes/dodonaut"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/signup">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}

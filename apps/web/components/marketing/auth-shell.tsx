import Link from "next/link";
import { Wordmark } from "./wordmark";

/**
 * Two-column auth/onboarding shell.
 * Left: form/content card on paper-white.
 * Right: editorial sidebar with eyebrow + giant quote/metric.
 */
export function AuthShell({
  step,
  totalSteps,
  eyebrow,
  asideTitle,
  asideBody,
  asideMetric,
  children,
}: {
  step?: number;
  totalSteps?: number;
  eyebrow: string;
  asideTitle: string;
  asideBody: string;
  asideMetric?: { value: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <Wordmark className="h-6 w-6 text-foreground" />
            <span className="font-display text-lg font-bold tracking-tight">
              Dodonaut
            </span>
          </Link>
          {step && totalSteps && (
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Step {String(step).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}
            </p>
          )}
        </div>
      </header>
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1200px] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <main className="flex items-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-md">
            <p className="eyebrow mb-6">{eyebrow}</p>
            {children}
          </div>
        </main>
        <aside className="hidden border-l border-border bg-surface lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-16">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
              {asideTitle}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              {asideBody}
            </p>
          </div>
          {asideMetric && (
            <div className="mt-12 border-t border-subtle-border pt-8">
              <div className="font-mono text-5xl tracking-tight text-primary">
                {asideMetric.value}
              </div>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                {asideMetric.label}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ClosingCta() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:py-32">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h2 className="text-3xl leading-tight tracking-tight sm:text-4xl">
              Ship your first agent endpoint in 90 seconds.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Free for the first <span className="font-mono">1,000</span>{" "}
              settled calls. Your Dodo merchant flow is unchanged.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/signup">
              Get started
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Hero } from "@/components/marketing/hero";
import { ByTheNumbers } from "@/components/marketing/by-the-numbers";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { BuiltOn } from "@/components/marketing/built-on";
import { ClosingCta } from "@/components/marketing/closing-cta";
import { SiteNav } from "@/components/marketing/site-nav";
import { SiteFooter } from "@/components/marketing/site-footer";

export default async function HomePage() {
  // If already signed in, jump straight to dashboard.
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user) redirect("/dashboard");
  } catch {
    // Auth not configured locally yet — render marketing page.
  }

  return (
    <div className="min-h-screen">
      <SiteNav />
      <main>
        <Hero />
        <ByTheNumbers />
        <div id="how-it-works">
          <HowItWorks />
        </div>
        <BuiltOn />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}

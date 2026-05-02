import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

export default function Terms() {
  return (
    <>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container py-12">
        <article className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-ink-muted">Placeholder copy. Final version pre-launch.</p>
          <p className="mt-6">By using Crafty you agree to act in good faith, post truthful information about your craft, store, or studio, and respect other community members. Listings that violate these terms may be hidden or removed by Crafty admins.</p>
        </article>
      </main>
      <AppFooter />
    </>
  );
}

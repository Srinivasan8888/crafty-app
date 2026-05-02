import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

export default function Privacy() {
  return (
    <>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container py-12">
        <article className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-ink-muted">Placeholder copy. Final version pre-launch.</p>
          <p className="mt-6">Crafty collects only the minimum personal data needed to power discovery — your email, name, profile photo, and the public contact methods you choose to share. We do not sell your data. For requests, email <a className="text-accent hover:underline" href="mailto:hello@crafty.app">hello@crafty.app</a>.</p>
        </article>
      </main>
      <AppFooter />
    </>
  );
}

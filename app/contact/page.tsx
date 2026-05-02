import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { Mail } from "lucide-react";

export default function Contact() {
  return (
    <>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container py-12">
        <div className="mx-auto max-w-xl card p-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight">Get in touch</h1>
          <p className="mt-3 text-sm text-ink-muted">
            Questions, claims, or partnership ideas — drop us a line.
          </p>
          <a href="mailto:hello@crafty.app" className="btn btn-primary mt-6 inline-flex">
            <Mail size={16} /> hello@crafty.app
          </a>
        </div>
      </main>
      <AppFooter />
    </>
  );
}

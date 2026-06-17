import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Crafty",
  description: "How Crafty collects, uses, and protects your personal data.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "17 June 2026";

export default function Privacy() {
  return (
    <>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container py-12">
        <article className="mx-auto max-w-2xl prose-crafty">
          <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-ink-muted">Last updated: {UPDATED}</p>

          <p className="mt-6 leading-relaxed">
            This Privacy Policy explains how <strong>Dealquick Labs Private Limited</strong> (&ldquo;Crafty&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, shares, and protects your personal data when you
            use Crafty. We act as the data fiduciary for this data under India&rsquo;s Digital Personal Data
            Protection Act, 2023 (&ldquo;DPDP Act&rdquo;). We collect only what we need to run a craft-discovery
            platform, and <strong>we never sell your personal data</strong>.
          </p>

          <h2 className="mt-8 text-xl font-bold">1. Data we collect</h2>
          <ul className="mt-3 list-disc pl-5 space-y-1 leading-relaxed">
            <li><strong>Account data</strong> — your email, name, and profile photo, provided via our sign-in provider when you create an account.</li>
            <li><strong>Listing &amp; content data</strong> — the crafter/store/studio/event details, photos, products, prices, reviews, and messages you choose to publish or send.</li>
            <li><strong>Transaction data</strong> — order, invoice, and payout records when you buy or sell. Payments are processed by our payment provider; we do not store full card or bank details.</li>
            <li><strong>Usage &amp; device data</strong> — pages viewed, searches, saves, approximate location derived from your IP, and basic device/browser information, used to operate, secure, and improve the Platform.</li>
            <li><strong>Cookies</strong> — a small set required for sign-in, plus optional analytics cookies that load only after you consent.</li>
          </ul>

          <h2 className="mt-8 text-xl font-bold">2. How we use your data</h2>
          <ul className="mt-3 list-disc pl-5 space-y-1 leading-relaxed">
            <li>To provide and personalise discovery, listings, saves, search, and recommendations;</li>
            <li>To enable accounts, messaging, reviews, orders, payouts, and invoices;</li>
            <li>To send service emails (e.g. sign-up confirmation, listing-live, event reminders) and, with consent, product updates;</li>
            <li>To keep the Platform safe — moderation, fraud and abuse prevention, and debugging;</li>
            <li>To meet legal, tax, and accounting obligations.</li>
          </ul>

          <h2 className="mt-8 text-xl font-bold">3. Consent and legal basis</h2>
          <p className="mt-3 leading-relaxed">
            We rely on your consent for analytics and marketing, and on the necessity of processing to provide
            the services you request and to meet our legal obligations. You can withdraw consent for optional
            cookies and marketing at any time (see your cookie choices and email preferences).
          </p>

          <h2 className="mt-8 text-xl font-bold">4. Service providers we share data with</h2>
          <p className="mt-3 leading-relaxed">
            We share data only with processors who help us run Crafty, under appropriate safeguards, including:
          </p>
          <ul className="mt-3 list-disc pl-5 space-y-1 leading-relaxed">
            <li>Cloud hosting and database providers (application hosting, image storage, and our managed Postgres database);</li>
            <li>Our authentication provider (secure sign-in);</li>
            <li>Our payment provider (to process payments and payouts);</li>
            <li>Email, analytics, error-monitoring, and rate-limiting providers (to deliver email, understand product usage with your consent, and keep the service reliable).</li>
          </ul>
          <p className="mt-3 leading-relaxed">
            We may also disclose data where required by law or to protect our rights and users.
          </p>

          <h2 className="mt-8 text-xl font-bold">5. Where your data is stored (cross-border)</h2>
          <p className="mt-3 leading-relaxed">
            Some of our providers store and process data on servers located outside India (for example, in
            Singapore). Where data is transferred across borders, we do so in line with the DPDP Act and use
            providers that offer appropriate protection. By using Crafty you acknowledge this cross-border
            processing.
          </p>

          <h2 className="mt-8 text-xl font-bold">6. Cookies and analytics</h2>
          <p className="mt-3 leading-relaxed">
            Essential cookies enable sign-in and security. Optional analytics load only after you click
            &ldquo;Accept&rdquo; on our cookie banner, and help us understand which crafters and pages are being
            discovered. You can decline analytics and still use the Platform.
          </p>

          <h2 className="mt-8 text-xl font-bold">7. Data retention</h2>
          <p className="mt-3 leading-relaxed">
            We keep personal data only as long as needed for the purposes above or as required by law (for
            example, tax records). When you delete your account, we delete or anonymise your personal data,
            except where we must retain certain records.
          </p>

          <h2 className="mt-8 text-xl font-bold">8. Your rights</h2>
          <p className="mt-3 leading-relaxed">Under the DPDP Act you can:</p>
          <ul className="mt-3 list-disc pl-5 space-y-1 leading-relaxed">
            <li>access and obtain a copy of your personal data (you can export your data from your account);</li>
            <li>correct or update inaccurate data;</li>
            <li>request erasure of your data;</li>
            <li>withdraw consent for optional processing;</li>
            <li>nominate another person to exercise your rights in case of death or incapacity;</li>
            <li>raise a grievance with us (see contact below) and, if unresolved, with the Data Protection Board of India.</li>
          </ul>

          <h2 className="mt-8 text-xl font-bold">9. Children</h2>
          <p className="mt-3 leading-relaxed">
            Crafty is not directed at children under 18, and we do not knowingly collect their data. If you
            believe a child has provided us data, contact us and we will delete it.
          </p>

          <h2 className="mt-8 text-xl font-bold">10. Security</h2>
          <p className="mt-3 leading-relaxed">
            We use reasonable technical and organisational measures — including encrypted connections, access
            controls, and trusted infrastructure providers — to protect your data. No method of transmission or
            storage is completely secure, but we work to protect your information and respond to incidents.
          </p>

          <h2 className="mt-8 text-xl font-bold">11. Changes to this policy</h2>
          <p className="mt-3 leading-relaxed">
            We may update this policy from time to time. We will post the new version here with a revised
            &ldquo;Last updated&rdquo; date and, for material changes, notify you on the Platform or by email.
          </p>

          <h2 className="mt-8 text-xl font-bold">12. Contact &amp; Grievance Officer</h2>
          <p className="mt-3 leading-relaxed">
            For privacy questions or to exercise your rights, email{" "}
            <a className="text-accent hover:underline" href="mailto:privacy@crafty.app">privacy@crafty.app</a>.
            Our Grievance Officer (as required under the DPDP Act and IT Rules) can be reached at the same
            address; we aim to acknowledge grievances within the timelines required by law. General queries:{" "}
            <a className="text-accent hover:underline" href="mailto:hello@crafty.app">hello@crafty.app</a>.
          </p>
        </article>
      </main>
      <AppFooter />
    </>
  );
}

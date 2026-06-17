import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Crafty",
  description: "The terms that govern your use of Crafty.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "17 June 2026";

export default function Terms() {
  return (
    <>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container py-12">
        <article className="mx-auto max-w-2xl prose-crafty">
          <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-ink-muted">Last updated: {UPDATED}</p>

          <p className="mt-6 leading-relaxed">
            Crafty is operated by <strong>Dealquick Labs Private Limited</strong> (&ldquo;Crafty&rdquo;,
            &ldquo;we&rdquo;, &ldquo;us&rdquo;), a company incorporated in India and based in Bengaluru, Karnataka.
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Crafty website,
            apps, and services (together, the &ldquo;Platform&rdquo;). By using the Platform you agree to these
            Terms. If you do not agree, please do not use the Platform.
          </p>

          <h2 className="mt-8 text-xl font-bold">1. Who can use Crafty</h2>
          <p className="mt-3 leading-relaxed">
            You must be at least 18 years old and able to form a legally binding contract under Indian law.
            If you use Crafty on behalf of a business, you confirm you are authorised to bind that business
            to these Terms.
          </p>

          <h2 className="mt-8 text-xl font-bold">2. Your account</h2>
          <p className="mt-3 leading-relaxed">
            Sign-in is handled by our authentication provider. You are responsible for the activity on your
            account and for keeping your access credentials secure. Provide accurate information and keep it
            up to date. Tell us promptly at{" "}
            <a className="text-accent hover:underline" href="mailto:hello@crafty.app">hello@crafty.app</a>{" "}
            if you believe your account has been compromised.
          </p>

          <h2 className="mt-8 text-xl font-bold">3. Listings and content</h2>
          <p className="mt-3 leading-relaxed">
            Crafters, stores, and studios are responsible for the listings, photos, products, prices, events,
            and other content they publish (&ldquo;Your Content&rdquo;). You represent that Your Content is
            truthful, that you own or have the rights to it, and that it does not infringe anyone&rsquo;s rights
            or violate any law. You retain ownership of Your Content and grant Crafty a non-exclusive,
            worldwide, royalty-free licence to host, display, resize, and promote it for the purpose of
            operating and marketing the Platform.
          </p>
          <p className="mt-3 leading-relaxed">You must not post content that:</p>
          <ul className="mt-3 list-disc pl-5 space-y-1 leading-relaxed">
            <li>is false, misleading, or impersonates another person or business;</li>
            <li>is unlawful, infringing, hateful, harassing, or sexually explicit;</li>
            <li>promotes counterfeit goods or items you are not legally permitted to sell;</li>
            <li>contains malware, spam, or attempts to manipulate rankings, reviews, or search.</li>
          </ul>
          <p className="mt-3 leading-relaxed">
            We may hide, remove, or restrict any listing or content, and suspend or terminate accounts, that
            we reasonably believe violate these Terms or harm the community.
          </p>

          <h2 className="mt-8 text-xl font-bold">4. Buying and selling</h2>
          <p className="mt-3 leading-relaxed">
            Crafty enables buyers to discover and, where available, purchase from independent sellers. The
            contract of sale for any product or service is between the buyer and the seller; sellers are
            responsible for their products, descriptions, pricing, taxes, fulfilment, and customer support.
            Where Crafty facilitates payments, we may charge sellers a commission (currently 10% of the order
            value) and issue GST invoices as applicable. Payments are processed by our third-party payment
            provider; we do not store full card details. Refunds, returns, and cancellations are handled
            according to the seller&rsquo;s stated policy and applicable consumer law.
          </p>

          <h2 className="mt-8 text-xl font-bold">5. Reviews and community</h2>
          <p className="mt-3 leading-relaxed">
            Reviews must reflect genuine, first-hand experience. Do not post fake, incentivised, or retaliatory
            reviews. We may moderate, hide, or remove reviews and responses that violate these Terms.
          </p>

          <h2 className="mt-8 text-xl font-bold">6. Fees and paid features</h2>
          <p className="mt-3 leading-relaxed">
            Listing on Crafty is free. Some features (such as featured placement or a Pro subscription) are
            paid. Prices and inclusions are shown at the point of purchase and may change with notice. Except
            where required by law, paid features are non-refundable once the benefit has been delivered.
          </p>

          <h2 className="mt-8 text-xl font-bold">7. Intellectual property</h2>
          <p className="mt-3 leading-relaxed">
            The Crafty name, logo, design, and software are owned by Dealquick Labs Private Limited and
            protected by law. These Terms do not grant you any right to use our brand without prior written
            permission.
          </p>

          <h2 className="mt-8 text-xl font-bold">8. Disclaimers</h2>
          <p className="mt-3 leading-relaxed">
            The Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. We do not
            guarantee that listings are accurate or that the Platform will be uninterrupted or error-free.
            Crafty is a discovery and facilitation platform and is not the manufacturer or seller of items
            listed by others.
          </p>

          <h2 className="mt-8 text-xl font-bold">9. Limitation of liability</h2>
          <p className="mt-3 leading-relaxed">
            To the maximum extent permitted by law, Crafty and its team will not be liable for any indirect,
            incidental, or consequential losses, or for disputes between buyers and sellers. Nothing in these
            Terms limits liability that cannot be limited under applicable law.
          </p>

          <h2 className="mt-8 text-xl font-bold">10. Termination</h2>
          <p className="mt-3 leading-relaxed">
            You may stop using Crafty at any time. We may suspend or end your access if you breach these Terms
            or to protect the Platform or its users. Sections that by their nature should survive termination
            (such as intellectual property, disclaimers, and limitation of liability) will continue to apply.
          </p>

          <h2 className="mt-8 text-xl font-bold">11. Governing law</h2>
          <p className="mt-3 leading-relaxed">
            These Terms are governed by the laws of India. The courts at Bengaluru, Karnataka have exclusive
            jurisdiction, subject to any non-waivable rights you have as a consumer.
          </p>

          <h2 className="mt-8 text-xl font-bold">12. Changes</h2>
          <p className="mt-3 leading-relaxed">
            We may update these Terms from time to time. Material changes will be notified on the Platform or
            by email. Continued use after changes take effect means you accept the updated Terms.
          </p>

          <h2 className="mt-8 text-xl font-bold">13. Contact</h2>
          <p className="mt-3 leading-relaxed">
            Questions about these Terms? Email{" "}
            <a className="text-accent hover:underline" href="mailto:hello@crafty.app">hello@crafty.app</a>.
            See also our{" "}
            <a className="text-accent hover:underline" href="/privacy">Privacy Policy</a>.
          </p>
        </article>
      </main>
      <AppFooter />
    </>
  );
}

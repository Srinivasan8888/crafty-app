import Link from "next/link";
import { ClerkProvider, SignUp } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { craftyClerkAppearance, craftyClerkLocalization } from "@/lib/clerkAppearance";

export default function SignUpPage() {
  return (
    <ClerkProvider
      appearance={craftyClerkAppearance}
      localization={craftyClerkLocalization}
    >
      <header
        className="sticky top-0 z-50"
        style={{
          background: "rgb(var(--cream))",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          className="flex items-center justify-between px-[18px] md:px-[var(--container-pad)] py-3 md:py-[18px] mx-auto"
          style={{ maxWidth: "var(--container-max)" }}
        >
          <Link href="/" className="inline-flex items-center" aria-label="Crafty home">
            <Logo size="md" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-semibold"
            style={{ color: "rgb(var(--muted))" }}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to site
          </Link>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-cream p-6">
        <SignUp
          appearance={craftyClerkAppearance}
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
        />
      </div>
    </ClerkProvider>
  );
}

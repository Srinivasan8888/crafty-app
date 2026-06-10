import Link from "next/link";
import { MaybeAuthProvider } from "@/components/MaybeAuthProvider";
import { AppHeader } from "@/components/AppHeader";
import dynamic from "next/dynamic";

const CreatorWalkthrough = dynamic(
  () => import("@/components/CreatorWalkthrough").then((m) => m.CreatorWalkthrough),
  { ssr: false },
);
import { AppFooter } from "@/components/AppFooter";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <MaybeAuthProvider>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container my-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wider text-ink-subtle">Signed in as</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{user.display_name ?? user.email}</p>
              {/* V3 — Pro pill renders only when subscription_tier=PRO + not expired. */}
              <SubscriptionStatus />
            </div>
            {user.is_admin && <p className="text-xs text-accent">admin</p>}
          </div>
          <nav className="mt-3 grid gap-1 text-sm">
            {[
              ["Overview", "/dashboard"],
              ["My crafter", "/dashboard/crafter"],
              ["My store", "/dashboard/store"],
              ["My studio", "/dashboard/studio"],
              ["My events", "/dashboard/events"],
              ["Saved", "/dashboard/saved"],
              ["Saved searches", "/dashboard/saved-searches"],
              ["Products", "/dashboard/products"],
              ["Cart", "/dashboard/cart"],
              ["Orders", "/dashboard/orders"],
              ["Sales", "/dashboard/sales"],
              ["Messages", "/dashboard/messages"],
              ["Crafty Pro", "/dashboard/subscription"],
              ["API keys", "/dashboard/api-keys"],
            ].map(([label, href]) => (
              <Link key={href as string} href={href as string} className="rounded-md px-3 py-2 hover:bg-canvas-sunken">{label}</Link>
            ))}
            {user.is_admin && (
              <Link href="/admin" className="mt-3 rounded-md px-3 py-2 text-accent hover:bg-canvas-sunken">Admin →</Link>
            )}
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </main>
      <AppFooter />
      <CreatorWalkthrough />
    </MaybeAuthProvider>
  );
}

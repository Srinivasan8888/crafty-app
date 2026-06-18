import Link from "next/link";
import { MaybeAuthProvider } from "@/components/MaybeAuthProvider";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let me;
  try {
    me = await requireAdmin();
  } catch {
    redirect("/forbidden");
  }

  // Owner-only nav items are appended only for SUPERADMINs; their routes are
  // independently guarded by requireSuperadmin() (nav is cosmetic).
  const navItems: Array<[string, string]> = [
    ...(me!.is_superadmin
      ? ([
          ["Owner console", "/admin/owner"],
          ["Admins & owners", "/admin/admins"],
        ] as Array<[string, string]>)
      : []),
    ["Flags", "/admin"],
    ["Listings", "/admin/listings"],
    ["Metrics", "/admin/metrics"],
    ["Cron health", "/admin/health"],
    ["Users", "/admin/users"],
    ["Cities", "/admin/cities"],
    ["City requests", "/admin/city-requests"],
    ["Claim requests", "/admin/claim-requests"],
    ["Categories", "/admin/categories"],
    ["API keys", "/admin/api-keys"],
    ["Audit log", "/admin/audit-log"],
    ["Export CSV", "/admin/export"],
  ];

  return (
    <MaybeAuthProvider>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container my-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wider text-accent">Admin console</p>
            <p className="mt-1 text-sm">Crafty internal</p>
          </div>
          <nav className="mt-3 grid gap-1 text-sm">
            {navItems.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-md px-3 py-2 hover:bg-canvas-sunken">{label}</Link>
            ))}
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </main>
      <AppFooter />
    </MaybeAuthProvider>
  );
}

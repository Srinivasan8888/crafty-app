import { MaybeAuthProvider } from "@/components/MaybeAuthProvider";
import { DashboardNav } from "@/components/DashboardNav";
import { AppHeader } from "@/components/AppHeader";
import dynamic from "next/dynamic";

const CreatorWalkthrough = dynamic(
  () => import("@/components/CreatorWalkthrough").then((m) => m.CreatorWalkthrough),
  { ssr: false },
);
import { AppFooter } from "@/components/AppFooter";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // Unread-conversation count for the owner inbox, computed from the existing
  // read pointers (same rule as /dashboard/messages): a conversation is unread
  // when owner_last_read_at is null or older than last_message_at. Clears as
  // soon as the owner opens/reads the thread. No schema change.
  const ownerConvs = await prisma.conversation.findMany({
    where: { owner_user_id: user.id },
    select: { owner_last_read_at: true, last_message_at: true },
    take: 200,
  });
  const unreadMessages = ownerConvs.filter(
    (c) => !c.owner_last_read_at || c.owner_last_read_at.getTime() < c.last_message_at.getTime(),
  ).length;

  return (
    <MaybeAuthProvider>
      <AppHeader city={process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "bengaluru"} />
      <main id="main" className="container mt-14 mb-12 md:mt-20 md:mb-16 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-4">
            <p className="text-xs uppercase tracking-wider text-ink-subtle">Signed in as</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{user.display_name ?? user.email}</p>
              {/* V3 — Pro pill renders only when subscription_tier=PRO + not expired. */}
              <SubscriptionStatus />
            </div>
            {user.is_admin && <p className="text-xs text-accent">admin</p>}
          </div>
          <DashboardNav unreadMessages={unreadMessages} isAdmin={user.is_admin} />
        </aside>
        <section className="min-w-0">{children}</section>
      </main>
      <AppFooter />
      {/* Tour copy assumes a crafter — only show to creators/admins. */}
      {(user.role === "CREATOR" || user.role === "ADMIN") && <CreatorWalkthrough />}
    </MaybeAuthProvider>
  );
}

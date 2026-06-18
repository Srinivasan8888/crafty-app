"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, requireSuperadmin, superadminCount } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

// superadmin-god-mode: role changes are SUPERADMIN-only (ADMINs keep moderation
// powers — ban/unban below — but cannot change roles). Owner-tier moves live in
// /admin/admins; this stays for VISITOR/CREATOR/ADMIN management.
export async function setUserRole(userId: string, role: "VISITOR" | "CREATOR" | "ADMIN") {
  const admin = await requireSuperadmin();
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  // Last-superadmin invariant: this path only sets VISITOR/CREATOR/ADMIN, so
  // touching a SUPERADMIN here is always a demotion — block the final owner.
  if (target?.role === "SUPERADMIN" && (await superadminCount()) <= 1) {
    throw new Error("Cannot demote the last superadmin — promote another owner first.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { role, is_admin: role === "ADMIN" },
  });
  void logAudit({ actorUserId: admin.id, action: "user.set_role", entityType: "USER", entityId: userId, metadata: { role } });
  revalidatePath("/admin/users");
}

export async function setUserBan(userId: string, banned: boolean) {
  const admin = await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { is_banned: banned },
  });
  void logAudit({ actorUserId: admin.id, action: banned ? "user.ban" : "user.unban", entityType: "USER", entityId: userId });
  revalidatePath("/admin/users");
}

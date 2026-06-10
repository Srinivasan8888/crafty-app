"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function setUserRole(userId: string, role: "VISITOR" | "CREATOR" | "ADMIN") {
  const admin = await requireAdmin();
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

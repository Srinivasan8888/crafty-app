"use server";

// superadmin-god-mode — admin/owner management. Every action is SUPERADMIN-only,
// audited, and enforces the last-superadmin invariant.

import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";
import { requireSuperadmin, superadminCount } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendAdminInvite } from "@/lib/email";
import { randomBytes, createHash } from "crypto";
import { revalidatePath } from "next/cache";

const INVITE_TTL_DAYS = 14;

function normEmail(v: FormDataEntryValue | null): string {
  return String(v ?? "").trim().toLowerCase();
}

export async function inviteAdmin(formData: FormData) {
  const sa = await requireSuperadmin();
  const email = normEmail(formData.get("email"));
  const role = String(formData.get("role") ?? "ADMIN");
  if (!email || !email.includes("@")) throw new Error("Enter a valid email");
  if (role !== "ADMIN" && role !== "SUPERADMIN") throw new Error("Invalid role");

  // Single active invite per email — supersede any prior pending one.
  await prisma.adminInvite.updateMany({
    where: { email, status: "PENDING" },
    data: { status: "REVOKED" },
  });

  const token = randomBytes(24).toString("hex");
  const token_hash = createHash("sha256").update(token).digest("hex");
  const invite = await prisma.adminInvite.create({
    data: {
      email,
      role,
      token_hash,
      invited_by_user_id: sa.id,
      expires_at: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  void sendAdminInvite({ to: email, role, inviterName: sa.display_name });
  void logAudit({
    actorUserId: sa.id,
    action: "admin.invite.create",
    entityType: "USER",
    metadata: { email, role, inviteId: invite.id },
  });
  revalidatePath("/admin/admins");
}

export async function revokeInvite(formData: FormData) {
  const sa = await requireSuperadmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing invite id");
  await prisma.adminInvite.update({ where: { id }, data: { status: "REVOKED" } });
  void logAudit({ actorUserId: sa.id, action: "admin.invite.revoke", metadata: { inviteId: id } });
  revalidatePath("/admin/admins");
}

// Promote/demote an existing account. Allowed targets: CREATOR | ADMIN | SUPERADMIN.
export async function setAdminRole(formData: FormData) {
  const sa = await requireSuperadmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!["CREATOR", "ADMIN", "SUPERADMIN"].includes(role)) throw new Error("Invalid role");
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true },
  });
  if (!target) throw new Error("User not found");

  // Last-superadmin invariant: never remove the final owner.
  if (target.role === "SUPERADMIN" && role !== "SUPERADMIN") {
    if ((await superadminCount()) <= 1) {
      throw new Error("Cannot demote the last superadmin — promote another owner first.");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role, is_admin: role === "ADMIN" || role === "SUPERADMIN" },
  });
  void logAudit({
    actorUserId: sa.id,
    action: "admin.set_role",
    entityType: "USER",
    entityId: userId,
    metadata: { role, previous: target.role },
  });
  revalidatePath("/admin/admins");
}

// Transfer ownership: promote target to SUPERADMIN, optionally step self down to
// ADMIN. Order guarantees we never drop below one superadmin.
export async function transferOwnership(formData: FormData) {
  const sa = await requireSuperadmin();
  const userId = String(formData.get("userId") ?? "");
  const stepDown = String(formData.get("stepDown") ?? "") === "on";
  if (!userId) throw new Error("Pick an account");
  if (userId === sa.id) throw new Error("Pick a different account to transfer to");
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw new Error("User not found");

  await prisma.user.update({
    where: { id: userId },
    data: { role: "SUPERADMIN", is_admin: true },
  });
  void logAudit({
    actorUserId: sa.id,
    action: "admin.transfer_ownership",
    entityType: "USER",
    entityId: userId,
    metadata: { stepDown },
  });

  if (stepDown) {
    // Safe: we just added a superadmin, so the count is >= 2.
    await prisma.user.update({
      where: { id: sa.id },
      data: { role: "ADMIN", is_admin: true },
    });
    void logAudit({ actorUserId: sa.id, action: "admin.step_down", entityType: "USER", entityId: sa.id });
  }
  revalidatePath("/admin/admins");
}

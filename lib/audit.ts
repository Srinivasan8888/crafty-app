// PRD §24 — audit log helper. Write-only from server (admin actions, owner
// mutations, webhook handlers). Read surface is /admin/audit-log.
//
// Fire-and-forget by design: a failed write must never block the underlying
// mutation. Catches and logs to console.error instead of throwing.

import { prisma } from "./db";

export type AuditEntityType =
  | "USER" | "CRAFTER" | "STORE" | "STUDIO" | "EVENT" | "FLAG"
  | "CITY" | "CITY_REQUEST" | "CATEGORY" | "EXPORT" | "WEBHOOK";

type Args = {
  actorUserId: string;
  action: string;                  // e.g. "user.promote", "crafter.update", "store.transfer"
  entityType?: AuditEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function logAudit(args: Args): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor_user_id: args.actorUserId,
        action: args.action,
        entity_type: args.entityType ?? null,
        entity_id: args.entityId ?? null,
        metadata: (args.metadata ?? null) as any,
      },
    });
  } catch (e) {
    console.error("[audit:write-failed]", args.action, e);
  }
}

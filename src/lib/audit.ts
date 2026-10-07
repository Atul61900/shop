import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Append-only trail of staff actions.
 *
 * Logging must never break the action it is recording, so every failure here
 * is swallowed — a full audit table is an operational problem, not a reason
 * to fail an admin's request.
 */
export async function recordAdminAction(input: {
  actor: string;
  action:
    | "PRODUCT_CREATED"
    | "PRODUCT_UPDATED"
    | "PRODUCT_DELETED"
    | "SERVICE_CREATED"
    | "SERVICE_UPDATED"
    | "SERVICE_DELETED"
    | "CATEGORY_CREATED"
    | "CATEGORY_UPDATED"
    | "CATEGORY_DELETED"
    | "ORDER_UPDATED"
    | "IMAGE_UPLOADED";
  target: string;
  detail?: string;
  ip?: string;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actor: input.actor,
        action: input.action,
        target: input.target.slice(0, 200),
        detail: input.detail?.slice(0, 500),
        ip: input.ip?.slice(0, 64),
      },
    });
  } catch (err) {
    console.error("[audit] could not record admin action:", err);
  }
}

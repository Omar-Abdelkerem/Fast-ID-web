import { http } from "msw";
import { fail, ok, paginate } from "@/mocks/helpers";
import { db } from "@/mocks/store";
import { mockUsers } from "@/mocks/fixtures";

const actions = [
  "APPLICATION_SUBMITTED", "APPLICATION_REVIEW_STARTED", "APPLICATION_APPROVED", "APPLICATION_REJECTED", "APPLICATION_CANCELLED",
  "CREDENTIAL_ISSUED", "CREDENTIAL_REVOKED", "DELIVERY_CREATED", "DELIVERY_ASSIGNED", "DELIVERY_OUT_FOR_DELIVERY", "DELIVERY_FAILED",
  "DELIVERY_COMPLETED", "SERVICE_CREATED", "SERVICE_UPDATED", "SERVICE_PUBLISHED", "SERVICE_UNPUBLISHED", "SERVICE_DELETED",
  "STAFF_CREATED", "STAFF_UPDATED", "CITIZEN_DEACTIVATED", "CITIZEN_REACTIVATED", "PAYMENT_MARKED_PAID_MOCK", "PASSWORD_RESET_COMPLETED", "SETTINGS_UPDATED",
];
const entityTypes = ["APPLICATION", "SERVICE", "CREDENTIAL", "DELIVERY", "USER", "SETTINGS"];
const entityOf = (action) => (action.startsWith("APPLICATION") || action.startsWith("PAYMENT") ? "APPLICATION" : action.split("_")[0] === "SERVICE" ? "SERVICE" : action.startsWith("CREDENTIAL") ? "CREDENTIAL" : action.startsWith("DELIVERY") ? "DELIVERY" : action === "SETTINGS_UPDATED" ? "SETTINGS" : "USER");

// about 30 entries, newest first. The actor is the admin or the agent, or null (the system).
const hour = 3600 * 1000;
const seeds = Array.from({ length: 30 }, (_, i) => {
  const action = actions[(i * 5) % actions.length];
  const entityType = entityOf(action);
  const systemAction = action === "DELIVERY_CREATED" || action === "CREDENTIAL_ISSUED" || action === "PASSWORD_RESET_COMPLETED";
  const actor = systemAction ? null : action.startsWith("DELIVERY_OUT") || action === "DELIVERY_COMPLETED" || action === "DELIVERY_FAILED"
    ? { id: mockUsers.AGENT.id, fullName: mockUsers.AGENT.fullName, role: "AGENT" }
    : { id: mockUsers.ADMIN.id, fullName: mockUsers.ADMIN.fullName, role: "ADMIN" };
  const entityId = entityType === "SERVICE" ? "national-id" : entityType === "SETTINGS" ? "singleton" : `00000000-0000-4000-8000-${String(100 + i).padStart(12, "0")}`;
  const metadata = action.startsWith("APPLICATION_") ? { fromStatus: "SUBMITTED", toStatus: action.replace("APPLICATION_", "") } : action === "APPLICATION_REJECTED" ? { reasonCode: "INCOMPLETE_DOCUMENTS" } : {};
  return { id: `00000000-0000-4000-8000-${String(900 + i).padStart(12, "0")}`, actor, action, entityType, entityId, metadata, createdAt: new Date(Date.now() - (i + 1) * 5 * hour).toISOString() };
});
seeds.forEach((entry) => {
  if (!db.auditLogs.some((log) => log.id === entry.id)) db.auditLogs.push(entry);
});

export const handlers = [
  http.get("/api/v1/admin/audit-logs", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const wanted = params.get("action")?.split(",").filter(Boolean);
    if (wanted?.some((a) => !actions.includes(a))) return fail("VALIDATION_ERROR", "Invalid action", 400, { field: "action" });
    if (params.get("entityType") && !entityTypes.includes(params.get("entityType"))) return fail("VALIDATION_ERROR", "Invalid entityType", 400, { field: "entityType" });
    const from = params.get("from");
    const to = params.get("to");
    if (from && to && new Date(from) > new Date(to)) return fail("VALIDATION_ERROR", "from must not be after to", 400, { field: "from" });

    let list = [...db.auditLogs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (wanted?.length) list = list.filter((log) => wanted.includes(log.action));
    if (params.get("entityType")) list = list.filter((log) => log.entityType === params.get("entityType"));
    if (params.get("entityId")) list = list.filter((log) => log.entityId === params.get("entityId"));
    if (params.get("actorId")) list = list.filter((log) => log.actor?.id === params.get("actorId"));
    if (from) list = list.filter((log) => new Date(log.createdAt) >= new Date(from));
    if (to) list = list.filter((log) => new Date(log.createdAt) <= new Date(to));
    const { data, meta } = paginate(request, list);
    return ok(data, { meta });
  }),
];

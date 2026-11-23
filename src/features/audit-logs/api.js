import { apiGet } from "@/lib/api";

// params: page, pageSize, action (comma list), entityType, entityId, actorId, from, to (ISO 8601)
export const getAuditLogs = (params) => apiGet("/admin/audit-logs", { params });

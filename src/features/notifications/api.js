import { apiGet, apiPost } from "@/lib/api";

export async function getNotifications({ isRead, page = 1, pageSize = 20 } = {}) {
  const params = { page, pageSize };
  if (isRead !== undefined && isRead !== null && isRead !== "") {
    params.isRead = String(isRead);
  }
  return apiGet("/notifications", { params });
}

export async function getUnreadCount() {
  const res = await apiGet("/notifications/unread-count");
  return res.data;
}

export async function markNotificationRead(id) {
  const res = await apiPost(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await apiPost("/notifications/read-all");
  return res.data;
}

// Resolves the target route for a notification entity per contract §0.20 & Task 4 rules
export function getNotificationTarget(notification) {
  const entity = notification?.entity;
  if (!entity?.id) return null;
  if (entity.type === "APPLICATION") return `/applications/${entity.id}`;
  if (entity.type === "DELIVERY") return `/agent/deliveries/${entity.id}`;
  return null;
}

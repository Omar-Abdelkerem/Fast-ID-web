import { apiGet, apiPost } from "@/lib/api";

// params: page, pageSize, sort, status (comma separated), governorate, agentId, unassigned
export const getAdminDeliveries = (params) => apiGet("/admin/deliveries", { params });

export const getAdminDelivery = (id) => apiGet(`/admin/deliveries/${id}`).then((res) => res.data);

export const assignDelivery = (id, agentId) => apiPost(`/admin/deliveries/${id}/assign`, { agentId }).then((res) => res.data);

export const getActiveAgents = () =>
  apiGet("/admin/staff", { params: { role: "AGENT", isActive: true, pageSize: 100 } }).then((res) => res.data);

export const getGovernorates = () => apiGet("/reference/governorates").then((res) => res.data);

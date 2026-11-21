import { apiGet, apiPost } from "@/lib/api";

// params: page, pageSize, status (comma separated), sort
export const getAgentDeliveries = (params) => apiGet("/agent/deliveries", { params });

export const getAgentDelivery = (id) => apiGet(`/agent/deliveries/${id}`).then((res) => res.data);

export const startDelivery = (id) => apiPost(`/agent/deliveries/${id}/start`).then((res) => res.data);

export const confirmDelivery = (id, code) => apiPost(`/agent/deliveries/${id}/deliver`, { code }).then((res) => res.data);

// body: { reasonCode, reason? }
export const reportFailedAttempt = (id, body) => apiPost(`/agent/deliveries/${id}/fail`, body).then((res) => res.data);

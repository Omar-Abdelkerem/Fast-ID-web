import { apiGet, apiPost, apiDelete } from "@/lib/api";

export const getAdminServices = () => apiGet("/admin/services").then((res) => res.data);

export const publishService = (id) => apiPost(`/admin/services/${id}/publish`).then((res) => res.data);

export const unpublishService = (id) => apiPost(`/admin/services/${id}/unpublish`).then((res) => res.data);

export const deleteService = (id) => apiDelete(`/admin/services/${id}`).then((res) => res.data);

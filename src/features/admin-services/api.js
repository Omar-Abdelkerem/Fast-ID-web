import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";

export const getAdminServices = () => apiGet("/admin/services").then((res) => res.data);

export const getAdminService = (id) => apiGet(`/admin/services/${id}`).then((res) => res.data);

export const createService = (body) => apiPost("/admin/services", body).then((res) => res.data);

// body holds only the top-level keys that changed
export const updateService = (id, body) => apiPatch(`/admin/services/${id}`, body).then((res) => res.data);

export const publishService = (id) => apiPost(`/admin/services/${id}/publish`).then((res) => res.data);

export const unpublishService = (id) => apiPost(`/admin/services/${id}/unpublish`).then((res) => res.data);

export const deleteService = (id) => apiDelete(`/admin/services/${id}`).then((res) => res.data);

export const getServiceVersion = (id, version) => apiGet(`/admin/services/${id}/versions/${version}`).then((res) => res.data);

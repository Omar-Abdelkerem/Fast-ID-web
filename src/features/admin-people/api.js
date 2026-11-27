import { apiGet, apiPatch, apiPost } from "@/lib/api";

// staff: params are page, pageSize, role, isActive, q, sort
export const getStaff = (params) => apiGet("/admin/staff", { params });
export const createStaff = (body) => apiPost("/admin/staff", body).then((res) => res.data);
// body holds only the changed fields
export const updateStaff = (id, body) => apiPatch(`/admin/staff/${id}`, body).then((res) => res.data);

// citizens: params are page, pageSize, q, isActive, sort
export const getCitizens = (params) => apiGet("/admin/citizens", { params });
export const setCitizenActive = (id, isActive) => apiPatch(`/admin/citizens/${id}`, { isActive }).then((res) => res.data);

export const getGovernorates = () => apiGet("/reference/governorates").then((res) => res.data);

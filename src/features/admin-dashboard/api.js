import { apiGet, apiPatch } from "@/lib/api";

export const getStats = () => apiGet("/admin/stats").then((res) => res.data);

// public settings (also used for the announcement banner)
export const getSettings = () => apiGet("/settings").then((res) => res.data);

// body holds only the changed fields: supportEmail, supportPhone, announcement
export const updateSettings = (body) => apiPatch("/admin/settings", body).then((res) => res.data);

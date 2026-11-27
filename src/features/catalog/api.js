import { apiGet } from "@/lib/api";

// category is optional: IDENTITY, LICENSE, CIVIL_RECORD or OTHER
export const getServices = (category) => apiGet("/services", { params: { category } }).then((res) => res.data);

export const getService = (id) => apiGet(`/services/${id}`).then((res) => res.data);

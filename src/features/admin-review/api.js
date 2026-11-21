import { apiDownload, apiGet, apiPost } from "@/lib/api";

// params: page, pageSize, status, serviceId, governorate, overdue, q, submittedFrom, submittedTo, sort
export const getApplications = (params) => apiGet("/admin/applications", { params });

// the CSV of the same filtered set, without page and pageSize
export const exportApplications = (params) => apiDownload("/admin/applications/export", { params });

export const getApplication = (id) => apiGet(`/admin/applications/${id}`).then((res) => res.data);

export const startReview = (id) => apiPost(`/admin/applications/${id}/start-review`).then((res) => res.data);

// note is optional (internal, up to 500 characters)
export const approveApplication = (id, note) => apiPost(`/admin/applications/${id}/approve`, note ? { note } : {}).then((res) => res.data);

export const rejectApplication = (id, reasonCode, reason) => apiPost(`/admin/applications/${id}/reject`, { reasonCode, reason }).then((res) => res.data);

export const revokeCredential = (id, reason) => apiPost(`/admin/credentials/${id}/revoke`, { reason }).then((res) => res.data);

// labels of the answers: the frozen definition the application was submitted under
export const getServiceVersion = (serviceId, version) => apiGet(`/admin/services/${serviceId}/versions/${version}`).then((res) => res.data);

export const getAdminServices = () => apiGet("/admin/services").then((res) => res.data);

export const getGovernorates = () => apiGet("/reference/governorates").then((res) => res.data);

// opens a file: an image in the preview modal (returns an object URL), a PDF in a new tab
export async function fetchAttachment(applicationId, attachmentId) {
  const { blob } = await apiDownload(`/applications/${applicationId}/attachments/${attachmentId}/file`);
  return { blob, url: URL.createObjectURL(blob) };
}

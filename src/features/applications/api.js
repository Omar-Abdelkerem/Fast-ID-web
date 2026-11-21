import { apiDownload, apiGet, apiPost } from "@/lib/api";

// params: page, pageSize, status (comma list), serviceId, sort
export const getApplications = (params) => apiGet("/applications", { params });

export const getApplication = (id) => apiGet(`/applications/${id}`).then((res) => res.data);

// reason is optional (up to 300 characters); leave the key out when it is empty
export const cancelApplication = (id, reason) => apiPost(`/applications/${id}/cancel`, reason ? { reason } : {}).then((res) => res.data);

// the published definition, used to show labels next to the submitted answers
export const getService = (serviceId) => apiGet(`/services/${serviceId}`).then((res) => res.data);

export const getServices = () => apiGet("/services").then((res) => res.data);

// opens an attachment in a new tab (the session cookie is required, so it cannot be a plain link)
export async function openAttachment(applicationId, attachmentId) {
  const { blob } = await apiDownload(`/applications/${applicationId}/attachments/${attachmentId}/file`);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  // give the new tab time to read the file, then free the memory
  setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
}

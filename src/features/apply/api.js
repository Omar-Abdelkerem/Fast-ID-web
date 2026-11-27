import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "@/lib/api";

const ACTIVE_STATUSES = "DRAFT,SUBMITTED,UNDER_REVIEW,APPROVED,OUT_FOR_DELIVERY";

export async function getService(serviceId) {
  const res = await apiGet(`/services/${serviceId}`);
  return res.data;
}

export async function getGovernorates() {
  const res = await apiGet("/reference/governorates");
  return res.data;
}

export async function findActiveApplications(serviceId) {
  const res = await apiGet("/applications", {
    params: { serviceId, status: ACTIVE_STATUSES },
  });
  return res.data;
}

export async function getApplication(id) {
  const res = await apiGet(`/applications/${id}`);
  return res.data;
}

export async function createDraftApplication(serviceId) {
  const res = await apiPost("/applications", { serviceId });
  return res.data;
}

export async function patchApplication(id, payload) {
  const res = await apiPatch(`/applications/${id}`, payload);
  return res.data;
}

export async function uploadAttachment(applicationId, requirementKey, file, { onProgress } = {}) {
  const formData = new FormData();
  formData.append("requirementKey", requirementKey);
  formData.append("file", file);

  const res = await apiUpload(`/applications/${applicationId}/attachments`, formData, {
    onProgress,
  });
  return res.data;
}

export async function deleteAttachment(applicationId, attachmentId) {
  const res = await apiDelete(`/applications/${applicationId}/attachments/${attachmentId}`);
  return res.data;
}

export async function payApplicationMock(id) {
  const res = await apiPost(`/applications/${id}/payment/mock`);
  return res.data;
}

export async function submitApplication(id) {
  const res = await apiPost(`/applications/${id}/submit`);
  return res.data;
}

export async function deleteDraftApplication(id) {
  const res = await apiDelete(`/applications/${id}`);
  return res.data;
}

import axios from "axios";

// Every failed call throws an ApiError (see the API contract, section 0.3).
export class ApiError extends Error {
  constructor({ code, message, field = null, details = null, status = 0, retryAfter = null }) {
    super(message || code);
    this.name = "ApiError";
    this.code = code;
    this.field = field;
    this.details = details;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

// The base URL comes from the environment. Empty means the same origin as the web app.
const client = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`,
  withCredentials: true, // the session is an httpOnly cookie
  headers: { Accept: "application/json" },
});

// Global reactions (redirect to login, toast...) live in the React tree. The api layer only announces them.
function announce(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function reactToGlobalError(error) {
  if (error.code === "UNAUTHENTICATED") announce("fid:unauthenticated", error);
  if (error.code === "PASSWORD_CHANGE_REQUIRED") announce("fid:password-change-required", error);
  if (error.code === "ACCOUNT_DISABLED") announce("fid:account-disabled", error);
  if (error.code === "RATE_LIMITED") announce("fid:rate-limited", error);
}

function toApiError(err) {
  const body = err.response?.data?.error;
  if (body && body.code) {
    const retryAfter = Number(err.response.headers?.["retry-after"]) || null;
    return new ApiError({ ...body, status: err.response.status, retryAfter });
  }
  // no response at all, or a response that is not the envelope
  return new ApiError({
    code: err.response ? "INVALID_RESPONSE" : "NETWORK_ERROR",
    message: err.message,
    status: err.response?.status || 0,
  });
}

// Empty or undefined params are dropped
const cleanParams = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));

async function call(config) {
  try {
    const res = await client({ ...config, params: config.params ? cleanParams(config.params) : undefined });
    if (!res.data || res.data.success !== true) {
      throw new ApiError({ code: "INVALID_RESPONSE", message: "Response is not the API envelope", status: res.status });
    }
    return { data: res.data.data, meta: res.data.meta };
  } catch (err) {
    const error = err instanceof ApiError ? err : toApiError(err);
    reactToGlobalError(error);
    throw error;
  }
}

// path is relative to /api/v1 and starts with "/"; filters go in params, never in the path string
export const apiGet = (path, { params } = {}) => call({ method: "get", url: path, params });
export const apiPost = (path, body) => call({ method: "post", url: path, data: body });
export const apiPatch = (path, body) => call({ method: "patch", url: path, data: body });
export const apiDelete = (path) => call({ method: "delete", url: path });

// multipart upload, onProgress(percent 0-100)
export const apiUpload = (path, formData, { onProgress } = {}) =>
  call({
    method: "post",
    url: path,
    data: formData,
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded * 100) / event.total));
    },
  });

// files and CSV: returns { blob, filename }. Errors still use the JSON envelope.
export async function apiDownload(path, { params } = {}) {
  try {
    const res = await client.get(path, { params: cleanParams(params), responseType: "blob" });
    const disposition = res.headers["content-disposition"] || "";
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    return { blob: res.data, filename: match ? decodeURIComponent(match[1]) : "download" };
  } catch (err) {
    let error;
    try {
      // the error body arrives as a blob, so read it as text first
      const text = await err.response?.data?.text?.();
      const body = text ? JSON.parse(text).error : null;
      error = body?.code ? new ApiError({ ...body, status: err.response.status }) : toApiError(err);
    } catch {
      error = toApiError(err);
    }
    reactToGlobalError(error);
    throw error;
  }
}

// full URL, for example for EventSource
export const getApiUrl = (path) => `${client.defaults.baseURL}${path}`;

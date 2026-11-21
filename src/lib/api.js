import axios from "axios";

const rawOrigin = import.meta.env.VITE_API_BASE_URL || "";
const normalizedOrigin = rawOrigin.replace(/\/+$/, "");
const API_BASE_URL = `${normalizedOrigin}/api/v1`;

const apiHandlers = {
  onUnauthenticated: null,
  onPasswordChangeRequired: null,
  onAccountDisabled: null,
  onRateLimited: null,
};

export class ApiError extends Error {
  constructor({
    code = "UNKNOWN",
    message = "",
    field = null,
    details = null,
    status = 0,
    retryAfter = null,
  } = {}) {
    super(message || code);
    this.name = "ApiError";
    this.code = code;
    this.message = message || "";
    this.field = field;
    this.details = details;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export function registerApiHandlers(handlers = {}) {
  if ("onUnauthenticated" in handlers) {
    apiHandlers.onUnauthenticated = handlers.onUnauthenticated;
  }
  if ("onPasswordChangeRequired" in handlers) {
    apiHandlers.onPasswordChangeRequired = handlers.onPasswordChangeRequired;
  }
  if ("onAccountDisabled" in handlers) {
    apiHandlers.onAccountDisabled = handlers.onAccountDisabled;
  }
  if ("onRateLimited" in handlers) {
    apiHandlers.onRateLimited = handlers.onRateLimited;
  }

  return () => {
    if ("onUnauthenticated" in handlers) apiHandlers.onUnauthenticated = null;
    if ("onPasswordChangeRequired" in handlers) {
      apiHandlers.onPasswordChangeRequired = null;
    }
    if ("onAccountDisabled" in handlers) apiHandlers.onAccountDisabled = null;
    if ("onRateLimited" in handlers) apiHandlers.onRateLimited = null;
  };
}

export function getApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function serializeParams(params) {
  const searchParams = new URLSearchParams();
  if (!params || typeof params !== "object") {
    return "";
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      const cleaned = value.filter(
        (item) => item !== undefined && item !== null && item !== ""
      );
      if (cleaned.length > 0) {
        searchParams.set(key, cleaned.join(","));
      }
      continue;
    }
    if (typeof value === "boolean") {
      searchParams.set(key, value ? "true" : "false");
      continue;
    }
    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    Accept: "application/json",
  },
  paramsSerializer: {
    serialize: serializeParams,
  },
});

function parseRetryAfter(headers) {
  if (!headers) return null;
  const raw =
    typeof headers.get === "function"
      ? headers.get("retry-after")
      : headers["retry-after"];
  if (raw === undefined || raw === null || raw === "") return null;

  const asNumber = Number(raw);
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
    return Math.max(0, Math.ceil(asNumber));
  }

  const parsedDate = Date.parse(String(raw));
  if (!Number.isNaN(parsedDate)) {
    return Math.max(0, Math.ceil((parsedDate - Date.now()) / 1000));
  }

  return null;
}

function parseContentDispositionFilename(header) {
  if (!header || typeof header !== "string") {
    return "download";
  }

  // RFC 5987 UTF-8 encoded filename (supports Arabic filenames)
  const utf8Match = header.match(/filename\*\s*=\s*(?:UTF-8|utf-8)?''([^;]+)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      const decoded = decodeURIComponent(utf8Match[1].trim());
      const safeName = decoded.replace(/[/\\]/g, "_").trim();
      if (safeName) return safeName;
    } catch {
      // Fall through to standard filename parameter
    }
  }

  // Standard quoted or unquoted filename
  const quotedMatch = header.match(/filename\s*=\s*"([^"]+)"/i);
  if (quotedMatch && quotedMatch[1]) {
    const safeName = quotedMatch[1].replace(/[/\\]/g, "_").trim();
    if (safeName) return safeName;
  }

  const plainMatch = header.match(/filename\s*=\s*([^;\s]+)/i);
  if (plainMatch && plainMatch[1]) {
    const safeName = plainMatch[1].replace(/[/\\]/g, "_").trim();
    if (safeName) return safeName;
  }

  return "download";
}

function unwrapEnvelope(response) {
  const payload = response?.data;
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.success !== true ||
    !("data" in payload)
  ) {
    throw new ApiError({
      code: "INVALID_RESPONSE",
      message: "Unexpected response format.",
      status: response?.status ?? 0,
    });
  }

  if ("meta" in payload && payload.meta !== undefined) {
    return { data: payload.data, meta: payload.meta };
  }
  return { data: payload.data };
}

function dispatchGlobalHandlers(apiError) {
  if (apiError.status === 401 && apiError.code === "UNAUTHENTICATED") {
    apiHandlers.onUnauthenticated?.(apiError);
    return;
  }
  if (apiError.status === 403 && apiError.code === "PASSWORD_CHANGE_REQUIRED") {
    apiHandlers.onPasswordChangeRequired?.(apiError);
    return;
  }
  if (apiError.status === 403 && apiError.code === "ACCOUNT_DISABLED") {
    apiHandlers.onAccountDisabled?.(apiError);
    return;
  }
  if (apiError.status === 429 && apiError.code === "RATE_LIMITED") {
    apiHandlers.onRateLimited?.(apiError);
  }
}

async function normalizeError(error, skipGlobalHandlers = false) {
  let apiError;

  if (error instanceof ApiError) {
    apiError = error;
  } else if (!error?.response) {
    apiError = new ApiError({
      code: "NETWORK_ERROR",
      message: error?.message || "Network request failed.",
      status: 0,
    });
  } else {
    const { status, headers } = error.response;
    const retryAfter = parseRetryAfter(headers);
    let payload = error.response.data;

    // Blob error responses (from apiDownload) still carry the JSON error envelope
    if (typeof Blob !== "undefined" && payload instanceof Blob) {
      try {
        const text = await payload.text();
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (
      payload &&
      typeof payload === "object" &&
      payload.success === false &&
      payload.error &&
      typeof payload.error.code === "string"
    ) {
      apiError = new ApiError({
        code: payload.error.code,
        message: payload.error.message || "",
        field: payload.error.field ?? null,
        details: Array.isArray(payload.error.details)
          ? payload.error.details
          : null,
        status,
        retryAfter,
      });
    } else {
      apiError = new ApiError({
        code: "INVALID_RESPONSE",
        message: "Unexpected error response format.",
        status,
        retryAfter,
      });
    }
  }

  if (!skipGlobalHandlers) {
    dispatchGlobalHandlers(apiError);
  }

  throw apiError;
}

export async function apiGet(path, options = {}) {
  const { params, skipGlobalHandlers = false, signal } = options;
  try {
    const response = await apiClient.get(path, { params, signal });
    return unwrapEnvelope(response);
  } catch (error) {
    return normalizeError(error, skipGlobalHandlers);
  }
}

export async function apiPost(path, body, options = {}) {
  const { skipGlobalHandlers = false, signal } = options;
  // Bodyless POST endpoints accept {} with application/json (contract §0.2)
  const payload = body === undefined ? {} : body;
  try {
    const response = await apiClient.post(path, payload, {
      headers: { "Content-Type": "application/json" },
      signal,
    });
    return unwrapEnvelope(response);
  } catch (error) {
    return normalizeError(error, skipGlobalHandlers);
  }
}

export async function apiPatch(path, body, options = {}) {
  const { skipGlobalHandlers = false, signal } = options;
  const payload = body === undefined ? {} : body;
  try {
    const response = await apiClient.patch(path, payload, {
      headers: { "Content-Type": "application/json" },
      signal,
    });
    return unwrapEnvelope(response);
  } catch (error) {
    return normalizeError(error, skipGlobalHandlers);
  }
}

export async function apiDelete(path, options = {}) {
  const { skipGlobalHandlers = false, signal } = options;
  try {
    const response = await apiClient.delete(path, {
      data: {},
      headers: { "Content-Type": "application/json" },
      signal,
    });
    return unwrapEnvelope(response);
  } catch (error) {
    return normalizeError(error, skipGlobalHandlers);
  }
}

export async function apiUpload(path, formData, options = {}) {
  const { onProgress, skipGlobalHandlers = false, signal } = options;
  try {
    // Do not set Content-Type so the browser generates multipart/form-data with boundary
    const response = await apiClient.post(path, formData, {
      timeout: 120000,
      signal,
      onUploadProgress: onProgress
        ? (event) => {
            if (event.total) {
              const percent = Math.min(
                100,
                Math.round((event.loaded * 100) / event.total)
              );
              onProgress(percent);
            }
          }
        : undefined,
    });
    return unwrapEnvelope(response);
  } catch (error) {
    return normalizeError(error, skipGlobalHandlers);
  }
}

export async function apiDownload(path, options = {}) {
  const { params, skipGlobalHandlers = false, signal } = options;
  try {
    const response = await apiClient.get(path, {
      params,
      signal,
      responseType: "blob",
      headers: {
        Accept: "*/*",
      },
    });
    const disposition =
      typeof response.headers?.get === "function"
        ? response.headers.get("content-disposition")
        : response.headers?.["content-disposition"];
    const filename = parseContentDispositionFilename(disposition);
    return { blob: response.data, filename };
  } catch (error) {
    return normalizeError(error, skipGlobalHandlers);
  }
}

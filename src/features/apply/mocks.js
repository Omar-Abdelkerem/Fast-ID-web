import { http } from "msw";
import { ok, fail } from "@/mocks/helpers";
import { db, nextId } from "@/mocks/store";
import { mockUsers } from "@/mocks/fixtures";

const ACTIVE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "OUT_FOR_DELIVERY",
];

// Keep MSW strict enough to catch requests that the real API rejects.
// Public seed services may omit `availability`; those represent published services.
const GOVERNORATE_CODES = new Set([
  "CAIRO", "GIZA", "ALEXANDRIA", "QALYUBIA", "PORT_SAID", "SUEZ",
  "DAKAHLIA", "SHARQIA", "GHARBIA", "MONUFIA", "BEHEIRA",
  "KAFR_EL_SHEIKH", "DAMIETTA", "ISMAILIA", "FAIYUM", "BENI_SUEF",
  "MINYA", "ASSIUT", "SOHAG", "QENA", "LUXOR", "ASWAN", "RED_SEA",
  "NEW_VALLEY", "MATROUH", "NORTH_SINAI", "SOUTH_SINAI",
]);
const ADDRESS_KEYS = new Set(["governorate", "city", "addressLine", "phone", "notes"]);
const DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const PHONE_REGEX = /^01[0125][0-9]{8}$/;

function isPublished(service) {
  return service && (!service.availability || service.availability === "PUBLISHED");
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizePhone(value) {
  const trimmed = value.trim().replace(/[\s-]/g, "");
  if (trimmed.startsWith("+20")) return `0${trimmed.slice(3)}`;
  if (trimmed.startsWith("20") && trimmed.length === 12) return `0${trimmed.slice(2)}`;
  return trimmed;
}

function isRealDate(value) {
  const match = DATE_REGEX.exec(value);
  if (!match) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// Return a field-level problem instead of changing the stored application.
function validateAnswer(field, raw, { required = false, allowMissing = false } = {}) {
  const key = `data.${field.key}`;
  const missing = raw === null || raw === undefined;
  const blank = typeof raw === "string" && !raw.trim();
  if (missing || blank) {
    if (required) return { field: key, code: "REQUIRED", message: `${key} is required.` };
    if (missing && allowMissing) return null;
    return { field: key, code: "INVALID_FORMAT", message: `${key} is invalid.` };
  }

  const rules = field.validation || {};
  let valid = true;
  switch (field.type) {
    case "TEXT":
    case "TEXTAREA": {
      valid = typeof raw === "string";
      if (valid) {
        const value = raw.trim();
        valid = (rules.minLength === undefined || value.length >= rules.minLength) &&
          (rules.maxLength === undefined || value.length <= rules.maxLength);
        if (valid && field.type === "TEXT" && rules.pattern) {
          try { valid = new RegExp(rules.pattern).test(value); } catch { valid = false; }
        }
      }
      break;
    }
    case "NUMBER":
      valid = typeof raw === "number" && Number.isFinite(raw) &&
        (rules.min === undefined || raw >= rules.min) &&
        (rules.max === undefined || raw <= rules.max);
      break;
    case "DATE":
      valid = typeof raw === "string" && isRealDate(raw) &&
        (!rules.minDate || raw >= rules.minDate) &&
        (!rules.maxDate || raw <= rules.maxDate);
      break;
    case "SELECT":
      valid = typeof raw === "string" && (field.options || []).some((o) => o.value === raw);
      break;
    case "CHECKBOX":
      valid = typeof raw === "boolean" && (!required || raw === true);
      break;
    default:
      valid = false;
  }
  return valid ? null : { field: key, code: "INVALID_FORMAT", message: `${key} is invalid.` };
}

function validateAddressField(key, raw, { required = false } = {}) {
  const path = `deliveryAddress.${key}`;
  if (key === "notes" && (raw === null || raw === "")) return null;
  if (raw === undefined || raw === "" || (typeof raw === "string" && !raw.trim())) {
    return required ? { field: path, code: "REQUIRED", message: `${path} is required.` } :
      { field: path, code: "INVALID_FORMAT", message: `${path} is invalid.` };
  }
  if (key === "notes" && raw === null) return null;
  if (typeof raw !== "string") {
    return { field: path, code: "INVALID_FORMAT", message: `${path} is invalid.` };
  }
  const value = raw.trim();
  const valid = key === "governorate" ? GOVERNORATE_CODES.has(value) :
    key === "city" ? value.length >= 2 && value.length <= 60 :
    key === "addressLine" ? value.length >= 5 && value.length <= 200 :
    key === "phone" ? PHONE_REGEX.test(normalizePhone(value)) :
    key === "notes" ? value.length <= 300 : false;
  return valid ? null : { field: path, code: "INVALID_FORMAT", message: `${path} is invalid.` };
}

function validateFieldError(issue, status = 400) {
  return fail("VALIDATION_ERROR", issue.message, status, { field: issue.field });
}

async function detectUploadType(file) {
  if (!file || typeof file.slice !== "function") return null;
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return "image/jpeg";
  }
  if (head.length >= 8 &&
      [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => head[index] === byte)) {
    return "image/png";
  }
  if (head.length >= 5 && [37, 80, 68, 70, 45].every((byte, index) => head[index] === byte)) {
    return "application/pdf";
  }
  return null;
}

const MOCK_PAYMENT_ENABLED = import.meta.env.VITE_MOCK_PAYMENT_MODE !== "disabled";

let appCounter = 123;

function nextApplicationNumber() {
  appCounter += 1;
  return `APP-2026-${String(appCounter).padStart(6, "0")}`;
}

export const handlers = [
  // POST /api/v1/applications — create a new DRAFT
  http.post("/api/v1/applications", async ({ request }) => {
    const body = await request.json().catch(() => ({}));
    if (!plainObject(body)) {
      return fail("VALIDATION_ERROR", "A JSON object is required.", 400);
    }
    for (const key of Object.keys(body)) {
      if (key !== "serviceId") {
        return fail("UNKNOWN_FIELD", `Unknown field ${key}.`, 400, { field: key });
      }
    }
    const { serviceId } = body;
    if (typeof serviceId !== "string" || serviceId.length < 3 || serviceId.length > 60 ||
        !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(serviceId)) {
      return fail("VALIDATION_ERROR", "serviceId must be a valid service slug.", 400, {
        field: "serviceId",
      });
    }

    const service = db.services.find((s) => s.id === serviceId);
    if (!service) {
      return fail("SERVICE_NOT_FOUND", "Service not found.", 404);
    }
    if (!isPublished(service)) {
      return fail("SERVICE_NOT_AVAILABLE", "Service is not published.", 409);
    }

    const citizenId = mockUsers.CITIZEN.id;
    const existingActive = db.applications.find(
      (app) =>
        app.service.id === serviceId &&
        ACTIVE_STATUSES.includes(app.status) &&
        (!app.citizenId || app.citizenId === citizenId)
    );

    if (existingActive) {
      return fail(
        "ACTIVE_APPLICATION_EXISTS",
        "An active application already exists for this service.",
        409
      );
    }

    const now = new Date().toISOString();
    const isFree = !service.fee || service.fee.amount === 0;

    const newDraft = {
      id: nextId(),
      citizenId,
      applicationNumber: nextApplicationNumber(),
      service: { id: service.id, name: service.name },
      serviceVersion: service.version || 1,
      status: "DRAFT",
      data: {},
      deliveryAddress: null,
      payment: {
        status: isFree ? "NOT_REQUIRED" : "UNPAID",
        amount: service.fee || { amount: 0, currency: "EGP" },
        paidAt: null,
        reference: null,
      },
      attachments: [],
      submittedAt: null,
      dueAt: null,
      isOverdue: false,
      decision: null,
      credential: null,
      delivery: null,
      statusHistory: [],
      createdAt: now,
      updatedAt: now,
    };

    db.applications.unshift(newDraft);
    return ok(newDraft, { status: 201 });
  }),

  // PATCH /api/v1/applications/:id — merge data / deliveryAddress on DRAFT
  http.patch("/api/v1/applications/:id", async ({ params, request }) => {
    const app = db.applications.find((a) => a.id === params.id);
    if (!app) {
      return fail("APPLICATION_NOT_FOUND", "Application not found.", 404);
    }
    if (app.status !== "DRAFT") {
      return fail("APPLICATION_NOT_EDITABLE", "Application is not editable.", 409);
    }

    const body = await request.json().catch(() => ({}));
    if (!plainObject(body)) {
      return fail("VALIDATION_ERROR", "A JSON object is required.", 400);
    }
    for (const key of Object.keys(body)) {
      if (key !== "data" && key !== "deliveryAddress") {
        return fail("UNKNOWN_FIELD", `Unknown field ${key}.`, 400, { field: key });
      }
    }
    if (!Object.hasOwn(body, "data") && !Object.hasOwn(body, "deliveryAddress")) {
      return fail("VALIDATION_ERROR", "At least one of data or deliveryAddress is required.", 400);
    }
    const service = db.services.find((item) => item.id === app.service.id);
    if (!isPublished(service)) {
      return fail("SERVICE_NOT_AVAILABLE", "Service is not published.", 409);
    }

    const updatedData = { ...(app.data || {}) };
    if (Object.hasOwn(body, "data")) {
      if (!plainObject(body.data)) {
        return validateFieldError({ field: "data", message: "data must be an object." });
      }
      const fields = new Map((service.formSchema?.fields || []).map((f) => [f.key, f]));
      for (const [key, raw] of Object.entries(body.data)) {
        const field = fields.get(key);
        if (!field) {
          return fail("UNKNOWN_FIELD", `Unknown field data.${key}`, 400, { field: `data.${key}` });
        }
        if (raw === null) {
          delete updatedData[key];
          continue;
        }
        const issue = validateAnswer(field, raw);
        if (issue) return validateFieldError(issue);
        updatedData[key] = typeof raw === "string" ? raw.trim() : raw;
      }
    }

    const updatedAddress = { ...(app.deliveryAddress || {}) };
    if (Object.hasOwn(body, "deliveryAddress")) {
      if (!plainObject(body.deliveryAddress)) {
        return validateFieldError({
          field: "deliveryAddress", message: "deliveryAddress must be an object.",
        });
      }
      for (const [key, raw] of Object.entries(body.deliveryAddress)) {
        if (!ADDRESS_KEYS.has(key)) {
          return fail("UNKNOWN_FIELD", `Unknown field deliveryAddress.${key}`, 400, {
            field: `deliveryAddress.${key}`,
          });
        }
        const issue = validateAddressField(key, raw);
        if (issue) return validateFieldError(issue);
        updatedAddress[key] = key === "notes" && raw === "" ? null :
          key === "phone" ? normalizePhone(raw) :
          typeof raw === "string" ? raw.trim() : raw;
      }
    }

    // Commit only after validating all supplied fields.
    app.data = updatedData;
    if (Object.hasOwn(body, "deliveryAddress")) app.deliveryAddress = updatedAddress;

    app.updatedAt = new Date().toISOString();
    return ok(app);
  }),

  // DELETE /api/v1/applications/:id — discard DRAFT
  http.delete("/api/v1/applications/:id", ({ params }) => {
    const idx = db.applications.findIndex((a) => a.id === params.id);
    if (idx === -1) {
      return fail("APPLICATION_NOT_FOUND", "Application not found.", 404);
    }
    if (db.applications[idx].status !== "DRAFT") {
      return fail("APPLICATION_NOT_EDITABLE", "Application is not editable.", 409);
    }
    db.applications.splice(idx, 1);
    return ok({ id: params.id, deleted: true });
  }),

  // POST /api/v1/applications/:id/attachments — upload or replace a document
  http.post("/api/v1/applications/:id/attachments", async ({ params, request }) => {
    const app = db.applications.find((a) => a.id === params.id);
    if (!app) {
      return fail("APPLICATION_NOT_FOUND", "Application not found.", 404);
    }
    if (app.status !== "DRAFT") {
      return fail("APPLICATION_NOT_EDITABLE", "Application is not editable.", 409);
    }

    const formData = await request.formData();
    for (const key of formData.keys()) {
      if (key !== "requirementKey" && key !== "file") {
        return fail("UNKNOWN_FIELD", `Unknown multipart field ${key}.`, 400, { field: key });
      }
    }
    const requirementKey = formData.get("requirementKey");
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return fail("FILE_REQUIRED", "A file is required.", 400);
    }

    const service = db.services.find((s) => s.id === app.service.id);
    const reqDoc = (service?.requiredDocuments || []).find((d) => d.key === requirementKey);
    if (!reqDoc) {
      return fail("UNKNOWN_REQUIREMENT_KEY", "Unknown requirementKey.", 400, {
        field: "requirementKey",
      });
    }

    if (file.size > reqDoc.maxSizeBytes) {
      return fail("FILE_TOO_LARGE", "File exceeds maxSizeBytes.", 413);
    }

    // MIME metadata is not authoritative; detect JPEG/PNG/PDF magic bytes.
    const detected = await detectUploadType(file);
    if (!detected || !reqDoc.allowedMimeTypes.includes(detected)) {
      return fail("UNSUPPORTED_FILE_TYPE", "File type not allowed.", 415);
    }
    if (file.type !== detected) {
      return fail("FILE_CONTENT_MISMATCH", "File content does not match declared type.", 415);
    }
    if (formData.getAll("file").length !== 1) {
      return fail("VALIDATION_ERROR", "Exactly one file is required.", 400);
    }

    const attachment = {
      id: nextId(),
      requirementKey,
      originalName: file.name || "document",
      mimeType: detected,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    };

    app.attachments = [
      ...(app.attachments || []).filter((a) => a.requirementKey !== requirementKey),
      attachment,
    ];
    app.updatedAt = new Date().toISOString();

    return ok(attachment, { status: 201 });
  }),

  // DELETE /api/v1/applications/:id/attachments/:attachmentId
  http.delete("/api/v1/applications/:id/attachments/:attachmentId", ({ params }) => {
    const app = db.applications.find((a) => a.id === params.id);
    if (!app) {
      return fail("APPLICATION_NOT_FOUND", "Application not found.", 404);
    }
    if (app.status !== "DRAFT") {
      return fail("APPLICATION_NOT_EDITABLE", "Application is not editable.", 409);
    }

    const idx = (app.attachments || []).findIndex((a) => a.id === params.attachmentId);
    if (idx === -1) {
      return fail("ATTACHMENT_NOT_FOUND", "Attachment not found.", 404);
    }

    app.attachments.splice(idx, 1);
    app.updatedAt = new Date().toISOString();
    return ok({ id: params.attachmentId, deleted: true });
  }),

  // POST /api/v1/applications/:id/payment/mock — mark DRAFT as PAID
  http.post("/api/v1/applications/:id/payment/mock", ({ params }) => {
    if (!MOCK_PAYMENT_ENABLED) {
      return fail("PAYMENT_NOT_ENABLED", "Mock payment is disabled.", 404);
    }
    const app = db.applications.find((a) => a.id === params.id);
    if (!app) {
      return fail("APPLICATION_NOT_FOUND", "Application not found.", 404);
    }
    if (app.status !== "DRAFT") {
      return fail("APPLICATION_NOT_EDITABLE", "Application is not editable.", 409);
    }
    if (app.payment.status === "NOT_REQUIRED") {
      return fail("PAYMENT_NOT_REQUIRED", "No payment is required.", 409);
    }
    if (app.payment.status === "PAID") {
      return fail("PAYMENT_ALREADY_COMPLETED", "Payment already completed.", 409);
    }

    const now = new Date().toISOString();
    app.payment = {
      ...app.payment,
      status: "PAID",
      paidAt: now,
      reference: `MOCK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    };
    app.updatedAt = now;
    return ok(app);
  }),

  // POST /api/v1/applications/:id/submit — validate completeness & submit
  http.post("/api/v1/applications/:id/submit", ({ params }) => {
    const app = db.applications.find((a) => a.id === params.id);
    if (!app) {
      return fail("APPLICATION_NOT_FOUND", "Application not found.", 404);
    }
    if (app.status !== "DRAFT") {
      return fail("APPLICATION_NOT_EDITABLE", "Application is not editable.", 409);
    }

    const service = db.services.find((s) => s.id === app.service.id);
    if (!isPublished(service)) {
      return fail("SERVICE_NOT_AVAILABLE", "Service is no longer available.", 409);
    }

    const missingFields = [];
    for (const field of service.formSchema?.fields || []) {
      const issue = validateAnswer(field, app.data?.[field.key], { required: field.required, allowMissing: true });
      if (issue) missingFields.push(issue);
    }

    const addr = app.deliveryAddress || {};
    for (const key of ["governorate", "city", "addressLine", "phone"]) {
      const issue = validateAddressField(key, addr[key], { required: true });
      if (issue) missingFields.push(issue);
    }
    if (Object.hasOwn(addr, "notes")) {
      const issue = validateAddressField("notes", addr.notes);
      if (issue) missingFields.push(issue);
    }

    if (missingFields.length > 0) {
      return fail(
        "MISSING_REQUIRED_FIELDS",
        missingFields[0].message,
        400,
        { field: missingFields[0].field, details: missingFields }
      );
    }

    const missingDocs = [];
    for (const reqDoc of service.requiredDocuments || []) {
      const hasFile = (app.attachments || []).some((a) => a.requirementKey === reqDoc.key);
      if (reqDoc.required && !hasFile) {
        missingDocs.push({
          field: `attachments.${reqDoc.key}`,
          code: "REQUIRED",
          message: `Document ${reqDoc.key} is required.`,
        });
      }
    }

    if (missingDocs.length > 0) {
      return fail(
        "MISSING_REQUIRED_DOCUMENTS",
        missingDocs[0].message,
        400,
        { field: missingDocs[0].field, details: missingDocs }
      );
    }

    if (app.payment.status === "UNPAID") {
      return fail("PAYMENT_NOT_COMPLETED", "Payment must be completed before submitting.", 409);
    }

    const now = new Date();
    const due = new Date(now.getTime() + (service.slaDays || 3) * 86400000);

    app.status = "SUBMITTED";
    app.serviceVersion = service.version || 1;
    app.submittedAt = now.toISOString();
    app.dueAt = due.toISOString();
    app.updatedAt = now.toISOString();
    app.statusHistory = [
      ...(app.statusHistory || []),
      { status: "SUBMITTED", at: now.toISOString(), note: null },
    ];

    return ok(app);
  }),
];

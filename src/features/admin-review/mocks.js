import { http, HttpResponse } from "msw";
import { fail, ok, paginate } from "@/mocks/helpers";
import { db, nextId } from "@/mocks/store";
import { mockUsers, governorates } from "@/mocks/fixtures";

// These handlers work on db.applications, which the "applications" mocks seed (the citizen tracking task).
const hour = 3600 * 1000;
const statuses = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const rejectCodes = ["INCOMPLETE_DOCUMENTS", "UNCLEAR_DOCUMENTS", "INVALID_DATA", "DUPLICATE_REQUEST", "OTHER"];
const adminUser = () => ({ id: mockUsers.ADMIN.id, fullName: mockUsers.ADMIN.fullName, role: "ADMIN" });

// citizen details: stored on the application when seeded, otherwise the mock citizen
const citizenOf = (app) => app.citizen || mockUsers.CITIZEN;
const mask = (id = "") => (id.length > 4 ? `${id.slice(0, 2)}${"*".repeat(id.length - 4)}${id.slice(-2)}` : id);
const governorateName = (code) => governorates.find((g) => g.code === code)?.name.en || code || "";

// ----- shapes (contract section 0.20) -----
function listItem(app) {
  const citizen = citizenOf(app);
  return {
    id: app.id, applicationNumber: app.applicationNumber, service: app.service, status: app.status,
    citizen: { id: citizen.id, fullName: citizen.fullName, nationalIdMasked: mask(citizen.nationalId) },
    governorate: app.deliveryAddress?.governorate || null, submittedAt: app.submittedAt, dueAt: app.dueAt, isOverdue: app.isOverdue,
    paymentStatus: app.payment.status, deliveryStatus: app.delivery?.status || null,
  };
}

function deliveryRecord(app) {
  if (!app.delivery) return null;
  const citizen = citizenOf(app);
  const at = app.updatedAt;
  return {
    id: `00000000-0000-4000-8000-${app.id.slice(-12)}`, applicationId: app.id, applicationNumber: app.applicationNumber, service: app.service, status: app.delivery.status,
    attempts: app.delivery.attempts, recipientName: citizen.fullName, address: app.deliveryAddress,
    agent: app.delivery.agent ? { id: mockUsers.AGENT.id, fullName: app.delivery.agent.fullName } : null,
    assignedAt: app.delivery.agent ? at : null, outForDeliveryAt: app.delivery.status === "OUT_FOR_DELIVERY" ? at : null, deliveredAt: app.delivery.status === "DELIVERED" ? at : null,
    lastFailure: app.delivery.lastFailure, createdAt: at, updatedAt: at,
  };
}

function detail(app) {
  const citizen = citizenOf(app);
  const credential = app.credential ? db.credentials.find((c) => c.id === app.credential.id) || { ...app.credential, qrToken: "hidden" } : null;
  return {
    ...app,
    citizen: { id: citizen.id, fullName: citizen.fullName, nationalId: citizen.nationalId, birthDate: citizen.birthDate, gender: citizen.gender, email: citizen.email, phone: citizen.phone },
    statusHistory: app.statusHistory.map((entry) => ({ ...entry, by: entry.by ?? null })),
    decision: app.decision ? { ...app.decision, decidedBy: app.decision.decidedBy || null } : null,
    // the staff view shows the delivery code only to the citizen, never here
    delivery: app.delivery ? { ...app.delivery, deliveryCode: null } : null,
    deliveryRecord: deliveryRecord(app),
    credential,
  };
}

const find = (id) => db.applications.find((a) => a.id === id && a.status !== "DRAFT");
const notFound = () => fail("APPLICATION_NOT_FOUND", "Application not found.", 404);
const badTransition = () => fail("INVALID_STATUS_TRANSITION", "The status does not allow this action.", 409);
const touch = (app, status, note, decisionData) => {
  const now = new Date().toISOString();
  app.status = status;
  app.isOverdue = false;
  app.statusHistory.push({ status, at: now, note: note || null, by: adminUser() });
  app.updatedAt = now;
  if (decisionData) app.decision = { decidedAt: now, ...decisionData, decidedBy: { id: adminUser().id, fullName: adminUser().fullName } };
};

// ----- filtering shared by the list and the CSV export -----
function filtered(params) {
  let list = db.applications.filter((a) => a.status !== "DRAFT");
  const wanted = params.get("status")?.split(",").filter(Boolean);
  if (wanted?.length) list = list.filter((a) => wanted.includes(a.status));
  if (params.get("serviceId")) list = list.filter((a) => a.service.id === params.get("serviceId"));
  if (params.get("governorate")) list = list.filter((a) => a.deliveryAddress?.governorate === params.get("governorate"));
  if (params.get("overdue") === "true") list = list.filter((a) => a.isOverdue);
  const q = params.get("q")?.toLowerCase();
  if (q) list = list.filter((a) => a.applicationNumber.toLowerCase().startsWith(q) || citizenOf(a).nationalId === q || citizenOf(a).fullName.toLowerCase().includes(q));
  if (params.get("submittedFrom")) list = list.filter((a) => new Date(a.submittedAt) >= new Date(params.get("submittedFrom")));
  if (params.get("submittedTo")) list = list.filter((a) => new Date(a.submittedAt) <= new Date(params.get("submittedTo")));
  const sort = params.get("sort") || "-submittedAt";
  const key = sort.replace("-", "");
  return [...list].sort((a, b) => (sort.startsWith("-") ? -1 : 1) * (new Date(a[key] || 0) - new Date(b[key] || 0)));
}

function validateQuery(params) {
  const wanted = params.get("status")?.split(",").filter(Boolean);
  if (wanted?.some((s) => !statuses.includes(s))) return fail("VALIDATION_ERROR", "Invalid status", 400, { field: "status" });
  const q = params.get("q");
  if (q && (q.length < 3 || q.length > 100)) return fail("VALIDATION_ERROR", "q must be 3 to 100 characters", 400, { field: "q" });
  const from = params.get("submittedFrom");
  const to = params.get("submittedTo");
  if (from && to && new Date(from) > new Date(to)) return fail("VALIDATION_ERROR", "submittedFrom must not be after submittedTo", 400, { field: "submittedFrom" });
  if (!["submittedAt", "dueAt"].includes((params.get("sort") || "-submittedAt").replace("-", ""))) return fail("VALIDATION_ERROR", "Invalid sort", 400, { field: "sort" });
  return null;
}

// ----- CSV (a UTF-8 BOM first so Excel shows Arabic correctly; cells starting with = + - @ get a quote in front) -----
const label = (value) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
const safe = (cell) => (/^[=+\-@]/.test(String(cell)) ? `'${cell}` : String(cell));
const csvCell = (cell) => `"${safe(cell).replace(/"/g, '""')}"`;
const cairoDate = (iso) => (iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Africa/Cairo" }).slice(0, 16) : "");

function toCsv(list) {
  const header = ["Application No.", "Service", "Citizen", "National ID", "Governorate", "Status", "Submitted At", "Due At", "Overdue", "Fee (EGP)", "Payment", "Delivery"];
  const rows = list.map((a) => [
    a.applicationNumber, a.service.name.en, citizenOf(a).fullName, mask(citizenOf(a).nationalId), governorateName(a.deliveryAddress?.governorate), label(a.status),
    cairoDate(a.submittedAt), cairoDate(a.dueAt), a.isOverdue ? "Yes" : "No", (a.payment.amount.amount / 100).toFixed(2),
    { PAID: "Paid", UNPAID: "Unpaid", NOT_REQUIRED: "Not required" }[a.payment.status], a.delivery ? label(a.delivery.status) : "",
  ]);
  return String.fromCharCode(0xfeff) + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export const handlers = [
  // the export is registered before /:id so "export" is not read as an id
  http.get("/api/v1/admin/applications/export", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const problem = validateQuery(params);
    if (problem) return problem;
    const list = filtered(params);
    if (list.length > 10000) return fail("EXPORT_TOO_LARGE", "Too many rows.", 400);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Africa/Cairo" }).replace(/-/g, "");
    return new HttpResponse(toCsv(list), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="applications-${today}.csv"`, "Cache-Control": "no-store" } });
  }),

  http.get("/api/v1/admin/applications", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const problem = validateQuery(params);
    if (problem) return problem;
    const { data, meta } = paginate(request, filtered(params));
    return ok(data.map(listItem), { meta });
  }),

  http.get("/api/v1/admin/applications/:id", ({ params }) => {
    const app = find(params.id);
    return app ? ok(detail(app)) : notFound();
  }),

  http.post("/api/v1/admin/applications/:id/start-review", ({ params }) => {
    const app = find(params.id);
    if (!app) return notFound();
    if (app.status !== "SUBMITTED") return badTransition();
    touch(app, "UNDER_REVIEW");
    return ok(detail(app));
  }),

  // approving also issues a credential and creates the delivery
  http.post("/api/v1/admin/applications/:id/approve", async ({ params, request }) => {
    const app = find(params.id);
    if (!app) return notFound();
    if (app.status !== "UNDER_REVIEW") return badTransition();
    const { note } = await request.json().catch(() => ({}));
    if (note !== undefined && String(note).length > 500) return fail("VALIDATION_ERROR", "note is too long", 400, { field: "note" });

    const service = db.services.find((s) => s.id === app.service.id);
    const now = new Date();
    const credential = {
      id: nextId(), number: `CRD-${Math.random().toString(36).slice(2, 12).toUpperCase().padEnd(10, "X")}`, status: "ACTIVE", issuedAt: now.toISOString(),
      expiresAt: service?.validityYears ? new Date(now.getTime() + service.validityYears * 365 * 24 * hour).toISOString() : null,
      service: app.service, holderName: citizenOf(app).fullName, qrToken: `${nextId()}${nextId()}`.replace(/-/g, ""), applicationId: app.id,
    };
    db.credentials.push(credential);
    app.credential = { id: credential.id, number: credential.number, status: "ACTIVE", issuedAt: credential.issuedAt, expiresAt: credential.expiresAt };
    app.delivery = { status: "PENDING_ASSIGNMENT", attempts: 0, agent: null, deliveryCode: null, lastFailure: null };
    touch(app, "APPROVED", note, { outcome: "APPROVED", reasonCode: null, reason: null });
    return ok(detail(app));
  }),

  http.post("/api/v1/admin/applications/:id/reject", async ({ params, request }) => {
    const app = find(params.id);
    if (!app) return notFound();
    if (app.status !== "UNDER_REVIEW") return badTransition();
    const { reasonCode, reason } = await request.json();
    if (!rejectCodes.includes(reasonCode)) return fail("VALIDATION_ERROR", "Invalid reasonCode", 400, { field: "reasonCode" });
    if (typeof reason !== "string" || reason.trim().length < 10 || reason.trim().length > 500) return fail("VALIDATION_ERROR", "reason must be 10 to 500 characters", 400, { field: "reason" });
    touch(app, "REJECTED", reasonCode, { outcome: "REJECTED", reasonCode, reason: reason.trim() });
    return ok(detail(app));
  }),

  http.post("/api/v1/admin/credentials/:id/revoke", async ({ params, request }) => {
    const credential = db.credentials.find((c) => c.id === params.id);
    if (!credential) return fail("CREDENTIAL_NOT_FOUND", "Credential not found.", 404);
    if (credential.status !== "ACTIVE") return fail("CREDENTIAL_NOT_ACTIVE", "The credential is not active.", 409);
    const { reason } = await request.json();
    if (typeof reason !== "string" || reason.trim().length < 10 || reason.trim().length > 500) return fail("VALIDATION_ERROR", "reason must be 10 to 500 characters", 400, { field: "reason" });
    credential.status = "REVOKED";
    const app = db.applications.find((a) => a.credential?.id === credential.id);
    if (app) app.credential = { ...app.credential, status: "REVOKED" };
    return ok(credential);
  }),

  // the frozen definition of a published version (the "admin-services" mocks answer first when they exist)
  http.get("/api/v1/admin/services/:id/versions/:version", ({ params }) => {
    const service = db.adminServices.find((s) => s.id === params.id);
    if (!service) return fail("SERVICE_NOT_FOUND", "Service not found.", 404);
    const definition = service.versions?.[params.version];
    if (!definition) return fail("SERVICE_VERSION_NOT_FOUND", "Version not found.", 404);
    return ok({ version: Number(params.version), publishedAt: service.publishedAt, definition });
  }),
];

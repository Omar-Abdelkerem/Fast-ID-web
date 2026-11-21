import { http } from "msw";
import { fail, ok, paginate } from "@/mocks/helpers";
import { db } from "@/mocks/store";
import { mockUsers } from "@/mocks/fixtures";

// ids follow a fixed pattern so other mocks (credentials, notifications) can point at these applications
const pad = (n) => String(n).padStart(12, "0");
const appId = (n) => `a0000000-0000-4000-8000-${pad(n)}`;
const credId = (n) => `c0000000-0000-4000-8000-${pad(n)}`;
const hour = 3600 * 1000;
const ago = (hours) => new Date(Date.now() - hours * hour).toISOString();

const services = {
  "national-id": { id: "national-id", name: { ar: "بطاقة الرقم القومي", en: "National ID Card" }, fee: 5000, sla: 7, years: 7 },
  "driving-license": { id: "driving-license", name: { ar: "رخصة القيادة", en: "Driving license" }, fee: 20000, sla: 14, years: 10 },
};
const admin = { id: mockUsers.ADMIN.id, fullName: mockUsers.ADMIN.fullName, role: "ADMIN" };
const citizens = [
  mockUsers.CITIZEN,
  { ...mockUsers.CITIZEN, id: "66666666-6666-4666-8666-000000000001", fullName: "أحمد حسن علي", nationalId: "29505152301234", email: "ahmed@example.com", phone: "01011122001" },
  { ...mockUsers.CITIZEN, id: "66666666-6666-4666-8666-000000000002", fullName: "سارة محمود كمال", nationalId: "29708201401236", email: "sara@example.com", phone: "01011122002" },
  { ...mockUsers.CITIZEN, id: "66666666-6666-4666-8666-000000000003", fullName: "يوسف علي إبراهيم", nationalId: "30001011301238", email: "youssef@example.com", phone: "01011122003" },
];

// One application in the contract's shape (section 0.20). `citizen` and `by` are staff-only details,
// the citizen endpoints below remove them.
function makeApp({ n, serviceId, status, citizen = 0, submittedHoursAgo = null, history = [], decision = null, credential = null, delivery = null, governorate = "GIZA", paid = true, data }) {
  const service = services[serviceId];
  const submittedAt = submittedHoursAgo === null ? null : ago(submittedHoursAgo);
  const dueAt = submittedAt ? new Date(new Date(submittedAt).getTime() + service.sla * 24 * hour).toISOString() : null;
  const active = ["SUBMITTED", "UNDER_REVIEW"].includes(status);
  return {
    id: appId(n),
    applicationNumber: `APP-2026-${String(122 + n).padStart(6, "0")}`,
    citizen: citizens[citizen],
    service: { id: service.id, name: service.name },
    serviceVersion: 1,
    status,
    data: data || { fullName: citizens[citizen].fullName, delivery: "home" },
    deliveryAddress: status === "DRAFT" ? null : { governorate, city: "الدقي", addressLine: `${10 + n} شارع التحرير`, phone: citizens[citizen].phone, notes: null },
    payment: paid ? { status: "PAID", amount: { amount: service.fee, currency: "EGP" }, paidAt: submittedAt, reference: `MOCK-A${n}B2C3` } : { status: "UNPAID", amount: { amount: service.fee, currency: "EGP" }, paidAt: null, reference: null },
    attachments: status === "DRAFT" ? [] : [{ id: `f0000000-0000-4000-8000-${pad(n)}`, requirementKey: "photo", originalName: "photo.jpg", mimeType: "image/jpeg", sizeBytes: 204800, uploadedAt: submittedAt }],
    submittedAt,
    dueAt,
    isOverdue: active && dueAt ? new Date(dueAt) < new Date() : false,
    decision,
    credential,
    delivery,
    statusHistory: history,
    createdAt: ago((submittedHoursAgo || 1) + 5),
    updatedAt: ago(1),
  };
}

const credentialSummary = (n, status, issuedHoursAgo) => ({ id: credId(n), number: `CRD-SEED${pad(n).slice(-5)}`, status, issuedAt: ago(issuedHoursAgo), expiresAt: new Date(Date.now() + 7 * 365 * 24 * hour).toISOString() });
const step = (status, hoursAgo, note = null, by = null) => ({ status, at: ago(hoursAgo), note, by });

const seeds = [
  // a SUBMITTED application that is overdue (submitted 20 days ago, due in 7)
  makeApp({ n: 1, serviceId: "national-id", status: "SUBMITTED", citizen: 1, submittedHoursAgo: 20 * 24, history: [step("SUBMITTED", 20 * 24)] }),
  // APPROVED with a credential, waiting for assignment
  makeApp({
    n: 2, serviceId: "national-id", status: "APPROVED", citizen: 0, submittedHoursAgo: 48,
    history: [step("SUBMITTED", 48), step("UNDER_REVIEW", 30, null, admin), step("APPROVED", 24, "الأوراق سليمة", admin)],
    decision: { decidedAt: ago(24), outcome: "APPROVED", reasonCode: null, reason: null, decidedBy: { id: admin.id, fullName: admin.fullName } },
    credential: { ...credentialSummary(1, "ACTIVE", 24), number: "CRD-AB12CD34EF" },
    delivery: { status: "PENDING_ASSIGNMENT", attempts: 0, agent: null, deliveryCode: null, lastFailure: null },
  }),
  // OUT_FOR_DELIVERY with the delivery code the citizen gives to the agent
  makeApp({
    n: 3, serviceId: "driving-license", status: "OUT_FOR_DELIVERY", citizen: 0, submittedHoursAgo: 96, governorate: "GIZA",
    history: [step("SUBMITTED", 96), step("UNDER_REVIEW", 80, null, admin), step("APPROVED", 72, null, admin), step("OUT_FOR_DELIVERY", 2, null, { id: mockUsers.AGENT.id, fullName: mockUsers.AGENT.fullName, role: "AGENT" })],
    decision: { decidedAt: ago(72), outcome: "APPROVED", reasonCode: null, reason: null, decidedBy: { id: admin.id, fullName: admin.fullName } },
    credential: credentialSummary(4, "ACTIVE", 72),
    delivery: { status: "OUT_FOR_DELIVERY", attempts: 0, agent: { fullName: mockUsers.AGENT.fullName, phone: mockUsers.AGENT.phone }, deliveryCode: "123456", lastFailure: null },
  }),
  // REJECTED with a reason the citizen can read
  makeApp({
    n: 4, serviceId: "national-id", status: "REJECTED", citizen: 2, submittedHoursAgo: 120,
    history: [step("SUBMITTED", 120), step("UNDER_REVIEW", 100, null, admin), step("REJECTED", 96, "INCOMPLETE_DOCUMENTS", admin)],
    decision: { decidedAt: ago(96), outcome: "REJECTED", reasonCode: "INCOMPLETE_DOCUMENTS", reason: "صورة شهادة الميلاد غير واضحة. من فضلك أعد التقديم بصورة أوضح.", decidedBy: { id: admin.id, fullName: admin.fullName } },
  }),
  // APPROVED again after one failed delivery attempt
  makeApp({
    n: 5, serviceId: "national-id", status: "APPROVED", citizen: 3, submittedHoursAgo: 150, governorate: "CAIRO",
    history: [step("SUBMITTED", 150), step("UNDER_REVIEW", 130, null, admin), step("APPROVED", 120, null, admin), step("OUT_FOR_DELIVERY", 30, null, { id: mockUsers.AGENT.id, fullName: mockUsers.AGENT.fullName, role: "AGENT" }), step("APPROVED", 28, "تعذّر التسليم، سيعاد جدولة التوصيل")],
    decision: { decidedAt: ago(120), outcome: "APPROVED", reasonCode: null, reason: null, decidedBy: { id: admin.id, fullName: admin.fullName } },
    credential: credentialSummary(5, "ACTIVE", 120),
    delivery: { status: "FAILED_ATTEMPT", attempts: 1, agent: null, deliveryCode: null, lastFailure: { reasonCode: "CITIZEN_UNAVAILABLE", reason: null, at: ago(28) } },
  }),
  // DELIVERED (its credential was revoked later)
  makeApp({
    n: 6, serviceId: "driving-license", status: "DELIVERED", citizen: 0, submittedHoursAgo: 400,
    history: [step("SUBMITTED", 400), step("UNDER_REVIEW", 380, null, admin), step("APPROVED", 360, null, admin), step("OUT_FOR_DELIVERY", 300), step("DELIVERED", 296)],
    decision: { decidedAt: ago(360), outcome: "APPROVED", reasonCode: null, reason: null, decidedBy: { id: admin.id, fullName: admin.fullName } },
    credential: { ...credentialSummary(2, "REVOKED", 360), number: "CRD-ZX98YW76VU" },
    delivery: { status: "DELIVERED", attempts: 0, agent: null, deliveryCode: null, lastFailure: null },
  }),
  // CANCELLED by the citizen
  makeApp({ n: 7, serviceId: "national-id", status: "CANCELLED", citizen: 1, submittedHoursAgo: 200, history: [step("SUBMITTED", 200), step("CANCELLED", 190, "غيّرت رأيي")] }),
  // UNDER_REVIEW
  makeApp({ n: 8, serviceId: "driving-license", status: "UNDER_REVIEW", citizen: 2, submittedHoursAgo: 30, history: [step("SUBMITTED", 30), step("UNDER_REVIEW", 20, null, admin)] }),
  // a draft the citizen can continue
  makeApp({ n: 9, serviceId: "driving-license", status: "DRAFT", citizen: 0, paid: false, data: {} }),
];

seeds.forEach((seed) => {
  if (!db.applications.some((a) => a.id === seed.id)) db.applications.push(seed);
});

// the credentials these applications point to (the "credentials" mocks seed their own, by id)
[[credId(1), "CRD-AB12CD34EF", "ACTIVE", 2, "national-id", "valid-token"], [credId(4), "CRD-SEED00004", "ACTIVE", 3, "driving-license", "seed-token-4"], [credId(5), "CRD-SEED00005", "ACTIVE", 5, "national-id", "seed-token-5"]].forEach(([id, number, status, n, serviceId, qrToken]) => {
  if (db.credentials.some((c) => c.id === id)) return;
  db.credentials.push({ id, number, status, issuedAt: ago(48), expiresAt: new Date(Date.now() + 7 * 365 * 24 * hour).toISOString(), service: { id: serviceId, name: services[serviceId].name }, holderName: citizens[0].fullName, qrToken, applicationId: appId(n) });
});

// ----- citizen views -----
// the mock has one citizen, who sees every application
const isMine = () => true;
function citizenView(app) {
  const { citizen, ...rest } = app;
  void citizen;
  return {
    ...rest,
    statusHistory: app.statusHistory.map(({ status, at, note }) => ({ status, at, note })),
    decision: app.decision ? { decidedAt: app.decision.decidedAt, outcome: app.decision.outcome, reasonCode: app.decision.reasonCode, reason: app.decision.reason } : null,
  };
}
const listView = (app) => ({ ...citizenView(app), statusHistory: [], attachments: [] });

const statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export const handlers = [
  http.get("/api/v1/applications", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const wanted = params.get("status")?.split(",").filter(Boolean);
    if (wanted?.some((s) => !statuses.includes(s))) return fail("VALIDATION_ERROR", "Invalid status", 400, { field: "status" });
    let list = db.applications.filter(isMine);
    if (wanted?.length) list = list.filter((a) => wanted.includes(a.status));
    if (params.get("serviceId")) list = list.filter((a) => a.service.id === params.get("serviceId"));
    const sort = params.get("sort") || "-createdAt";
    const key = sort.replace("-", "");
    if (!["createdAt", "updatedAt"].includes(key)) return fail("VALIDATION_ERROR", "Invalid sort", 400, { field: "sort" });
    list = [...list].sort((a, b) => (sort.startsWith("-") ? -1 : 1) * (new Date(a[key]) - new Date(b[key])));
    const { data, meta } = paginate(request, list);
    return ok(data.map(listView), { meta });
  }),

  http.get("/api/v1/applications/:id", ({ params }) => {
    const application = db.applications.find((a) => a.id === params.id && isMine(a));
    return application ? ok(citizenView(application)) : fail("APPLICATION_NOT_FOUND", "Application not found.", 404);
  }),

  http.post("/api/v1/applications/:id/cancel", async ({ params, request }) => {
    const application = db.applications.find((a) => a.id === params.id && isMine(a));
    if (!application) return fail("APPLICATION_NOT_FOUND", "Application not found.", 404);
    if (application.status !== "SUBMITTED") return fail("INVALID_STATUS_TRANSITION", "Only a submitted application can be cancelled.", 409);
    const body = await request.json().catch(() => ({}));
    if (body.reason !== undefined && String(body.reason).length > 300) return fail("VALIDATION_ERROR", "reason is too long", 400, { field: "reason" });
    application.status = "CANCELLED";
    application.isOverdue = false;
    application.statusHistory.push({ status: "CANCELLED", at: new Date().toISOString(), note: body.reason || null, by: null });
    application.updatedAt = new Date().toISOString();
    return ok(citizenView(application));
  }),
];

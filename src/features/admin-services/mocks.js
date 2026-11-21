import { http } from "msw";
import { ok, fail } from "@/mocks/helpers";
import { db } from "@/mocks/store";

function makeDraft(nameAr, nameEn, category, feePiastres) {
  return {
    name: { ar: nameAr, en: nameEn },
    description: { ar: `وصف ${nameAr}`, en: `${nameEn} description` },
    category,
    fee: { amount: feePiastres, currency: "EGP" },
    slaDays: 7,
    validityYears: 7,
    requiredDocuments: [
      { key: "photo", label: { ar: "صورة شخصية", en: "Personal photo" }, required: true, allowedMimeTypes: ["image/jpeg", "image/png"], maxSizeBytes: 2097152 },
    ],
    formSchema: {
      fields: [
        { key: "fullName", label: { ar: "الاسم بالكامل", en: "Full name" }, helpText: null, type: "TEXT", required: true, options: null, validation: { minLength: 3, maxLength: 100 } },
        { key: "delivery", label: { ar: "طريقة الاستلام", en: "Delivery method" }, helpText: { ar: "اختر طريقة الاستلام", en: "Pick how you receive it" }, type: "SELECT", required: true,
          options: [{ value: "home", label: { ar: "توصيل للمنزل", en: "Home delivery" } }, { value: "office", label: { ar: "استلام من المكتب", en: "Office pickup" } }], validation: {} },
      ],
    },
  };
}

// Seed: one service per availability state (only once)
if (db.adminServices.length === 0) {
  const now = new Date().toISOString();
  const published = makeDraft("بطاقة الرقم القومي", "National ID", "IDENTITY", 5000);
  const publishedV1 = { ...structuredClone(published), fee: { amount: 4000, currency: "EGP" } };
  db.adminServices.push(
    { id: "national-id", category: "IDENTITY", availability: "PUBLISHED", publishedVersion: 2, hasUnpublishedChanges: false, updatedAt: now, draft: published, versions: { 1: publishedV1, 2: structuredClone(published) } },
    { id: "driving-license", category: "LICENSE", availability: "PUBLISHED", publishedVersion: 1, hasUnpublishedChanges: true, updatedAt: now, draft: makeDraft("رخصة القيادة", "Driving license", "LICENSE", 20000), versions: { 1: makeDraft("رخصة القيادة", "Driving license", "LICENSE", 15000) } },
    { id: "birth-certificate", category: "CIVIL_RECORD", availability: "UNPUBLISHED", publishedVersion: 1, hasUnpublishedChanges: false, updatedAt: now, draft: makeDraft("شهادة الميلاد", "Birth certificate", "CIVIL_RECORD", 1000), versions: { 1: makeDraft("شهادة الميلاد", "Birth certificate", "CIVIL_RECORD", 1000) } },
    { id: "new-service", category: "OTHER", availability: "DRAFT", publishedVersion: null, hasUnpublishedChanges: true, updatedAt: now, draft: makeDraft("خدمة جديدة", "New service", "OTHER", 0), versions: {} }
  );
  // the public catalog shows the published ones
  db.services = db.adminServices
    .filter((s) => s.availability === "PUBLISHED")
    .map((s) => ({ id: s.id, version: s.publishedVersion, ...structuredClone(s.versions[s.publishedVersion]) }));
}

const findService = (id) => db.adminServices.find((s) => s.id === id);
const notFound = () => fail("SERVICE_NOT_FOUND", "Service not found", 404);
const withoutVersions = ({ versions, ...service }) => { void versions; return service; };

const draftKeys = ["name", "description", "category", "fee", "slaDays", "validityYears", "requiredDocuments", "formSchema"];
const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const keyRegex = /^[a-z][a-zA-Z0-9]{0,39}$/;
const isLocalized = (v, max) => v && ["ar", "en"].every((l) => typeof v[l] === "string" && v[l].length >= 1 && v[l].length <= max);
const inRange = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

// returns a list of { field, code } problems with the form schema and documents
function checkSchema(body) {
  const problems = [];
  const add = (field, code = "INVALID") => problems.push({ field, code });
  const docs = body.requiredDocuments;
  if (docs !== undefined) {
    if (!Array.isArray(docs) || docs.length > 10) add("requiredDocuments");
    else {
      const keys = new Set();
      docs.forEach((doc, i) => {
        if (!keyRegex.test(doc.key) || keys.has(doc.key)) add(`requiredDocuments[${i}].key`);
        keys.add(doc.key);
        if (!isLocalized(doc.label, 100)) add(`requiredDocuments[${i}].label`);
        if (!Array.isArray(doc.allowedMimeTypes) || doc.allowedMimeTypes.length < 1) add(`requiredDocuments[${i}].allowedMimeTypes`);
        if (!inRange(doc.maxSizeBytes, 1, 10485760)) add(`requiredDocuments[${i}].maxSizeBytes`);
      });
    }
  }
  const fields = body.formSchema?.fields;
  if (body.formSchema !== undefined) {
    if (!Array.isArray(fields) || fields.length > 30) add("formSchema.fields");
    else {
      const keys = new Set();
      fields.forEach((field, i) => {
        const path = `formSchema.fields[${i}]`;
        if (!keyRegex.test(field.key) || keys.has(field.key)) add(`${path}.key`);
        keys.add(field.key);
        if (!isLocalized(field.label, 100)) add(`${path}.label`);
        if (field.type === "SELECT") {
          if (!Array.isArray(field.options) || field.options.length < 2 || field.options.length > 50) add(`${path}.options`);
        } else if (field.options !== null) add(`${path}.options`);
        const v = field.validation || {};
        if (v.minLength !== undefined && v.maxLength !== undefined && v.minLength > v.maxLength) add(`${path}.validation.minLength`);
      });
    }
  }
  return problems;
}

// returns a fail() response when the body is wrong, otherwise null
function validateBody(body, { isCreate }) {
  const allowed = isCreate ? ["id", ...draftKeys] : draftKeys;
  const unknown = Object.keys(body).find((k) => !allowed.includes(k));
  if (unknown) return fail("UNKNOWN_FIELD", "Unknown field", 400, { field: unknown });
  if (!isCreate && Object.keys(body).length === 0) return fail("VALIDATION_ERROR", "At least one field is required", 400);
  if (isCreate) {
    if (typeof body.id !== "string" || body.id.length < 3 || body.id.length > 60 || !slugRegex.test(body.id)) return fail("VALIDATION_ERROR", "Invalid id", 400, { field: "id" });
    const missing = draftKeys.find((k) => body[k] === undefined);
    if (missing) return fail("VALIDATION_ERROR", "Missing field", 400, { field: missing });
  }
  if (body.name !== undefined && !isLocalized(body.name, 100)) return fail("VALIDATION_ERROR", "Invalid name", 400, { field: "name" });
  if (body.description !== undefined && !isLocalized(body.description, 500)) return fail("VALIDATION_ERROR", "Invalid description", 400, { field: "description" });
  if (body.fee !== undefined && (!inRange(body.fee.amount, 0, 10000000) || body.fee.currency !== "EGP")) return fail("VALIDATION_ERROR", "Invalid fee", 400, { field: "fee" });
  if (body.slaDays !== undefined && !inRange(body.slaDays, 1, 90)) return fail("VALIDATION_ERROR", "Invalid slaDays", 400, { field: "slaDays" });
  if (body.validityYears !== undefined && body.validityYears !== null && !inRange(body.validityYears, 1, 30)) return fail("VALIDATION_ERROR", "Invalid validityYears", 400, { field: "validityYears" });
  const problems = checkSchema(body);
  if (problems.length > 0) return fail("INVALID_FORM_SCHEMA", "Invalid form schema", 400, { details: problems });
  return null;
}

export const handlers = [
  http.get("/api/v1/admin/services", () => ok(db.adminServices.map(withoutVersions))),

  http.get("/api/v1/admin/services/:id", ({ params }) => {
    const service = findService(params.id);
    return service ? ok(withoutVersions(service)) : notFound();
  }),

  http.post("/api/v1/admin/services", async ({ request }) => {
    const body = await request.json();
    const problem = validateBody(body, { isCreate: true });
    if (problem) return problem;
    if (findService(body.id)) return fail("SERVICE_ALREADY_EXISTS", "Service already exists", 409, { field: "id" });
    const { id, ...draft } = body;
    const service = { id, category: draft.category, availability: "DRAFT", publishedVersion: null, hasUnpublishedChanges: true, updatedAt: new Date().toISOString(), draft, versions: {} };
    db.adminServices.push(service);
    return ok(withoutVersions(service), { status: 201 });
  }),

  http.patch("/api/v1/admin/services/:id", async ({ params, request }) => {
    const service = findService(params.id);
    if (!service) return notFound();
    const body = await request.json();
    const problem = validateBody(body, { isCreate: false });
    if (problem) return problem;
    Object.assign(service.draft, body);
    service.category = service.draft.category;
    service.hasUnpublishedChanges = true;
    service.updatedAt = new Date().toISOString();
    return ok(withoutVersions(service));
  }),

  http.get("/api/v1/admin/services/:id/versions/:version", ({ params }) => {
    const service = findService(params.id);
    if (!service) return notFound();
    const version = service.versions[params.version];
    if (!version) return fail("SERVICE_VERSION_NOT_FOUND", "Version not found", 404);
    return ok({ id: service.id, version: Number(params.version), ...version });
  }),

  http.post("/api/v1/admin/services/:id/publish", ({ params }) => {
    const service = findService(params.id);
    if (!service) return notFound();
    if (service.availability === "PUBLISHED" && !service.hasUnpublishedChanges) {
      return fail("NO_CHANGES_TO_PUBLISH", "No changes to publish", 409);
    }
    service.publishedVersion = (service.publishedVersion || 0) + 1;
    service.versions[service.publishedVersion] = structuredClone(service.draft);
    service.availability = "PUBLISHED";
    service.hasUnpublishedChanges = false;
    service.updatedAt = new Date().toISOString();
    // keep the public catalog in sync
    db.services = db.services.filter((s) => s.id !== service.id);
    db.services.push({ id: service.id, version: service.publishedVersion, ...structuredClone(service.draft) });
    return ok(withoutVersions(service));
  }),

  http.post("/api/v1/admin/services/:id/unpublish", ({ params }) => {
    const service = findService(params.id);
    if (!service) return notFound();
    if (service.availability !== "PUBLISHED") return fail("SERVICE_NOT_PUBLISHED", "Service is not published", 409);
    service.availability = "UNPUBLISHED";
    service.updatedAt = new Date().toISOString();
    db.services = db.services.filter((s) => s.id !== service.id);
    return ok(withoutVersions(service));
  }),

  http.delete("/api/v1/admin/services/:id", ({ params }) => {
    const service = findService(params.id);
    if (!service) return notFound();
    if (service.availability !== "DRAFT") {
      return fail("SERVICE_CANNOT_BE_DELETED", "Only never-published services can be deleted", 409);
    }
    db.adminServices = db.adminServices.filter((s) => s.id !== service.id);
    return ok({ id: service.id });
  }),
];

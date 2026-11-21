import { http } from "msw";
import { ok, fail } from "@/mocks/helpers";
import { db } from "@/mocks/store";

// Seed: one service per availability state (only once)
function makeDraft(nameAr, nameEn, category, feePiastres) {
  return {
    name: { ar: nameAr, en: nameEn },
    description: { ar: `وصف ${nameAr}`, en: `${nameEn} description` },
    category,
    fee: { amount: feePiastres, currency: "EGP" },
    slaDays: 7,
    validityYears: 7,
    requiredDocuments: [],
    formSchema: { fields: [] },
  };
}

if (db.adminServices.length === 0) {
  const now = new Date().toISOString();
  db.adminServices.push(
    { id: "national-id", category: "IDENTITY", availability: "PUBLISHED", publishedVersion: 2, hasUnpublishedChanges: false, updatedAt: now, draft: makeDraft("بطاقة الرقم القومي", "National ID", "IDENTITY", 5000), versions: {} },
    { id: "driving-license", category: "LICENSE", availability: "PUBLISHED", publishedVersion: 1, hasUnpublishedChanges: true, updatedAt: now, draft: makeDraft("رخصة القيادة", "Driving license", "LICENSE", 20000), versions: {} },
    { id: "birth-certificate", category: "CIVIL_RECORD", availability: "UNPUBLISHED", publishedVersion: 1, hasUnpublishedChanges: false, updatedAt: now, draft: makeDraft("شهادة الميلاد", "Birth certificate", "CIVIL_RECORD", 1000), versions: {} },
    { id: "new-service", category: "OTHER", availability: "DRAFT", publishedVersion: null, hasUnpublishedChanges: true, updatedAt: now, draft: makeDraft("خدمة جديدة", "New service", "OTHER", 0), versions: {} }
  );
}

const findService = (id) => db.adminServices.find((s) => s.id === id);
const notFound = () => fail("SERVICE_NOT_FOUND", "Service not found", 404);

export const handlers = [
  http.get("/api/v1/admin/services", () => ok(db.adminServices)),

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
    return ok(service);
  }),

  http.post("/api/v1/admin/services/:id/unpublish", ({ params }) => {
    const service = findService(params.id);
    if (!service) return notFound();
    if (service.availability !== "PUBLISHED") return fail("SERVICE_NOT_PUBLISHED", "Service is not published", 409);
    service.availability = "UNPUBLISHED";
    service.updatedAt = new Date().toISOString();
    db.services = db.services.filter((s) => s.id !== service.id);
    return ok(service);
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

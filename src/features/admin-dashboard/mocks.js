import { http } from "msw";
import { fail, ok } from "@/mocks/helpers";
import { db } from "@/mocks/store";

const applicationStatuses = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const deliveryStatuses = ["PENDING_ASSIGNMENT", "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED_ATTEMPT"];
const phoneRegex = /^(?:\+20|20|0)1[0125][0-9]{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// every status key is always present (0 when there is none); drafts are left out
function computeStats() {
  const applications = db.applications.filter((a) => a.status !== "DRAFT");
  const applicationsByStatus = Object.fromEntries(applicationStatuses.map((s) => [s, applications.filter((a) => a.status === s).length]));
  const deliveriesByStatus = Object.fromEntries(deliveryStatuses.map((s) => [s, db.deliveries.filter((d) => d.status === s).length]));

  // mean time from submission to decision over the last 30 days (null when there was no decision)
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  const decided = applications.filter((a) => a.decision && a.submittedAt && new Date(a.decision.decidedAt) >= since);
  const averageDecisionHours30d = decided.length
    ? Math.round((decided.reduce((sum, a) => sum + (new Date(a.decision.decidedAt) - new Date(a.submittedAt)), 0) / decided.length / 3600000) * 10) / 10
    : null;

  return {
    applicationsByStatus,
    overdueApplications: applications.filter((a) => a.isOverdue).length,
    deliveriesByStatus,
    unassignedDeliveries: deliveriesByStatus.PENDING_ASSIGNMENT,
    averageDecisionHours30d,
  };
}

export const handlers = [
  http.get("/api/v1/admin/stats", () => ok(computeStats())),

  http.patch("/api/v1/admin/settings", async ({ request }) => {
    const body = await request.json();
    const keys = Object.keys(body);
    const unknown = keys.find((k) => !["supportEmail", "supportPhone", "announcement"].includes(k));
    if (unknown) return fail("UNKNOWN_FIELD", "Unknown field.", 400, { field: unknown });
    if (keys.length === 0) return fail("VALIDATION_ERROR", "At least one field is required.", 400);

    if (body.supportEmail !== undefined && body.supportEmail !== null && !emailRegex.test(body.supportEmail)) return fail("VALIDATION_ERROR", "supportEmail is not valid.", 400, { field: "supportEmail" });
    if (body.supportPhone !== undefined && body.supportPhone !== null && !phoneRegex.test(body.supportPhone)) return fail("VALIDATION_ERROR", "supportPhone is not valid.", 400, { field: "supportPhone" });
    if (body.announcement !== undefined && body.announcement !== null) {
      const a = body.announcement;
      // each language 1 to 300 characters, both languages or none
      for (const lang of ["ar", "en"]) {
        if (typeof a[lang] !== "string" || a[lang].trim().length < 1 || a[lang].length > 300) return fail("VALIDATION_ERROR", `announcement.${lang} must be 1 to 300 characters`, 400, { field: `announcement.${lang}` });
      }
    }

    Object.assign(db.settings, body, { updatedAt: new Date().toISOString() });
    return ok(db.settings);
  }),
];

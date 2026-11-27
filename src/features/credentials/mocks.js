import { http } from "msw";
import { fail, ok } from "@/mocks/helpers";
import { db } from "@/mocks/store";

const nationalId = { ar: "بطاقة الرقم القومي", en: "National ID Card" };
const license = { ar: "رخصة القيادة", en: "Driving license" };

// Credential shape from the contract (section 0.20). Seeded once, by id, so other mocks can add their own.
const seeds = [
  { id: "c0000000-0000-4000-8000-000000000001", number: "CRD-AB12CD34EF", status: "ACTIVE", issuedAt: "2026-10-01T09:00:00.000Z", expiresAt: "2033-10-01T09:00:00.000Z", service: { id: "national-id", name: nationalId }, holderName: "منى محمد عبد الهادي", qrToken: "valid-token", applicationId: "a0000000-0000-4000-8000-000000000002" },
  { id: "c0000000-0000-4000-8000-000000000002", number: "CRD-ZX98YW76VU", status: "REVOKED", issuedAt: "2026-09-01T09:00:00.000Z", expiresAt: "2033-09-01T09:00:00.000Z", service: { id: "driving-license", name: license }, holderName: "منى محمد عبد الهادي", qrToken: "revoked-token", applicationId: "a0000000-0000-4000-8000-000000000006" },
  { id: "c0000000-0000-4000-8000-000000000003", number: "CRD-QQ11WW22EE", status: "EXPIRED", issuedAt: "2019-01-01T09:00:00.000Z", expiresAt: "2026-01-01T09:00:00.000Z", service: { id: "national-id", name: nationalId }, holderName: "منى محمد عبد الهادي", qrToken: "expired-token", applicationId: "a0000000-0000-4000-8000-000000000010" },
];
seeds.forEach((seed) => {
  if (!db.credentials.some((c) => c.id === seed.id)) db.credentials.push(seed);
});

export const handlers = [
  // newest first
  http.get("/api/v1/credentials", () => ok([...db.credentials].sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)))),

  http.get("/api/v1/credentials/:id", ({ params }) => {
    const credential = db.credentials.find((c) => c.id === params.id);
    return credential ? ok(credential) : fail("CREDENTIAL_NOT_FOUND", "Credential not found.", 404);
  }),
];

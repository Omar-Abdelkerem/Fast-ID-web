import { http } from "msw";
import { fail, ok } from "@/mocks/helpers";
import { db } from "@/mocks/store";

const sample = (status, number, issuedAt, expiresAt) => ({
  valid: status === "ACTIVE",
  status,
  credential: {
    number,
    service: { id: "national-id", name: { ar: "بطاقة الرقم القومي", en: "National ID Card" } },
    holderName: "منى م. ع.",
    issuedAt,
    expiresAt,
  },
});

// the holder name is masked: first word in full, the other words reduced to a letter and a period
const maskName = (name) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  return [first, ...rest.map((word) => `${word[0]}.`)].join(" ");
};

// fixed tokens for testing: valid-token, revoked-token, expired-token
const fixed = {
  "valid-token": sample("ACTIVE", "CRD-AB12CD34EF", "2026-10-01T09:00:00.000Z", "2033-10-01T09:00:00.000Z"),
  "revoked-token": sample("REVOKED", "CRD-ZX98YW76VU", "2026-09-01T09:00:00.000Z", "2033-09-01T09:00:00.000Z"),
  "expired-token": sample("EXPIRED", "CRD-QQ11WW22EE", "2019-01-01T09:00:00.000Z", "2026-01-01T09:00:00.000Z"),
};

export const handlers = [
  http.get("/api/v1/verify/:qrToken", ({ params }) => {
    if (fixed[params.qrToken]) return ok(fixed[params.qrToken]);

    // credentials created in the mock database (for example by an approval) can be verified too
    const credential = db.credentials.find((c) => c.qrToken === params.qrToken);
    if (!credential) return fail("CREDENTIAL_NOT_FOUND", "Credential not found.", 404);
    return ok({
      valid: credential.status === "ACTIVE",
      status: credential.status,
      credential: {
        number: credential.number,
        service: credential.service,
        holderName: maskName(credential.holderName),
        issuedAt: credential.issuedAt,
        expiresAt: credential.expiresAt,
      },
    });
  }),
];

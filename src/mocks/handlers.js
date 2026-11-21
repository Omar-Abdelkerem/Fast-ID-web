import { http } from "msw";
import {
  mockAdminServices,
  mockGovernorates,
  mockServices,
  mockUsers,
} from "./fixtures";
import { fail, ok, paginate } from "./helpers";
import {
  db,
  getActiveMockUser,
  nextId,
  setActiveMockUser,
  setMockRole,
} from "./store";

const VALID_BIRTH_GOV_CODES = new Set([
  "01",
  "02",
  "03",
  "04",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "31",
  "32",
  "33",
  "34",
  "35",
  "88",
]);

const VALID_CATEGORIES = new Set(["IDENTITY", "LICENSE", "CIVIL_RECORD", "OTHER"]);

function normalizePhone(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  let normalized = trimmed;
  if (normalized.startsWith("+20")) {
    normalized = `0${normalized.slice(3)}`;
  } else if (normalized.startsWith("20") && normalized.length === 12) {
    normalized = `0${normalized.slice(2)}`;
  }
  return /^01[0125][0-9]{8}$/.test(normalized) ? normalized : null;
}

function isValidEmail(raw) {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim().toLowerCase();
  return (
    trimmed.length > 0 &&
    trimmed.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  );
}

function validateFullName(raw) {
  if (typeof raw !== "string") return null;
  const collapsed = raw.trim().replace(/\s+/g, " ");
  if (collapsed.length < 3 || collapsed.length > 100) return null;
  const words = collapsed.split(" ");
  if (words.length < 2) return null;
  if (!/^[\p{L}\s'.-]+$/u.test(collapsed)) return null;
  return collapsed;
}

function parseNationalId(raw) {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!/^[23][0-9]{13}$/.test(value)) return null;

  const century = value[0] === "2" ? 1900 : 2000;
  const year = century + Number(value.slice(1, 3));
  const month = Number(value.slice(3, 5));
  const day = Number(value.slice(5, 7));
  const govCode = value.slice(7, 9);

  if (!VALID_BIRTH_GOV_CODES.has(govCode)) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  if (date.getTime() > Date.now()) return null;

  const birthDate = `${String(year).padStart(4, "0")}-${String(month).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;
  const genderDigit = Number(value[12]);
  const gender = genderDigit % 2 === 1 ? "MALE" : "FEMALE";

  return { nationalId: value, birthDate, gender };
}

function isValidPassword(password, { email, nationalId } = {}) {
  if (typeof password !== "string") return false;
  if (password.length < 8 || password.length > 128) return false;
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return false;

  const lower = password.toLowerCase();
  if (email) {
    const localPart = email.split("@")[0]?.toLowerCase() || "";
    if (localPart.length >= 3 && lower.includes(localPart)) {
      return false;
    }
  }
  if (nationalId && password.includes(nationalId)) {
    return false;
  }
  return true;
}

function toServiceSummary(service) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    fee: service.fee,
    slaDays: service.slaDays,
    validityYears: service.validityYears,
    version: service.version,
  };
}

function requireAuthUser(allowMustChangePassword = false) {
  const user = getActiveMockUser();
  if (!user) {
    return {
      error: fail("UNAUTHENTICATED", "Authentication required.", 401),
    };
  }
  if (!user.isActive) {
    return {
      error: fail("ACCOUNT_DISABLED", "Account is deactivated.", 403),
    };
  }
  if (!allowMustChangePassword && user.mustChangePassword) {
    return {
      error: fail(
        "PASSWORD_CHANGE_REQUIRED",
        "Password change is required.",
        403
      ),
    };
  }
  return { user };
}

async function readJsonBody(request) {
  try {
    const text = await request.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const foundationHandlers = [
  // §1.2 POST /api/v1/auth/login
  http.post("/api/v1/auth/login", async ({ request }) => {
    const body = await readJsonBody(request);
    if (!body || typeof body !== "object") {
      return fail("VALIDATION_ERROR", "Malformed JSON body.", 400);
    }

    const identifier = String(body.identifier ?? "").trim();
    const password = String(body.password ?? "");

    if (!identifier) {
      return fail("VALIDATION_ERROR", "identifier is required.", 400, {
        field: "identifier",
        details: [
          {
            field: "identifier",
            code: "REQUIRED",
            message: "identifier is required.",
          },
        ],
      });
    }

    if (!password) {
      return fail("VALIDATION_ERROR", "password is required.", 400, {
        field: "password",
        details: [
          {
            field: "password",
            code: "REQUIRED",
            message: "password is required.",
          },
        ],
      });
    }

    if (password === "wrong") {
      return fail(
        "INVALID_CREDENTIALS",
        "Identifier or password is incorrect.",
        401
      );
    }

    const lower = identifier.toLowerCase();
    let role = "CITIZEN";
    if (lower.startsWith("admin")) {
      role = "ADMIN";
    } else if (lower.startsWith("agent")) {
      role = "AGENT";
    }

    const matchedUser =
      db.users.find(
        (u) =>
          u.email.toLowerCase() === lower ||
          (u.nationalId && u.nationalId === identifier)
      ) ||
      db.users.find((u) => u.id === mockUsers[role].id) ||
      mockUsers[role];

    if (!matchedUser.isActive) {
      return fail("ACCOUNT_DISABLED", "Account is deactivated.", 403);
    }

    setActiveMockUser(matchedUser);
    return ok(matchedUser);
  }),

  // §1.1 POST /api/v1/auth/register
  http.post("/api/v1/auth/register", async ({ request }) => {
    const body = await readJsonBody(request);
    if (!body || typeof body !== "object") {
      return fail("VALIDATION_ERROR", "Malformed JSON body.", 400);
    }

    const allowedKeys = new Set([
      "fullName",
      "nationalId",
      "email",
      "phone",
      "password",
      "preferredLanguage",
      "acceptTerms",
    ]);
    for (const key of Object.keys(body)) {
      if (!allowedKeys.has(key)) {
        return fail("UNKNOWN_FIELD", `Unknown field: ${key}`, 400, {
          field: key,
        });
      }
    }

    if (body.acceptTerms !== true) {
      return fail("TERMS_NOT_ACCEPTED", "Terms must be accepted.", 400, {
        field: "acceptTerms",
      });
    }

    const parsedId = parseNationalId(body.nationalId);
    if (!parsedId) {
      return fail("INVALID_NATIONAL_ID", "National ID is invalid.", 400, {
        field: "nationalId",
      });
    }

    const details = [];
    const fullName = validateFullName(body.fullName);
    if (!fullName) {
      details.push({
        field: "fullName",
        code: body.fullName ? "INVALID_FORMAT" : "REQUIRED",
        message: "fullName must be 3-100 characters and at least 2 words.",
      });
    }

    const email = isValidEmail(body.email)
      ? body.email.trim().toLowerCase()
      : null;
    if (!email) {
      details.push({
        field: "email",
        code: body.email ? "INVALID_FORMAT" : "REQUIRED",
        message: "email must be a valid email address.",
      });
    }

    const phone = normalizePhone(body.phone);
    if (!phone) {
      details.push({
        field: "phone",
        code: body.phone ? "INVALID_FORMAT" : "REQUIRED",
        message: "phone must be a valid Egyptian mobile number.",
      });
    }

    if (
      !isValidPassword(body.password, {
        email: email || "",
        nationalId: parsedId.nationalId,
      })
    ) {
      details.push({
        field: "password",
        code: body.password ? "INVALID_FORMAT" : "REQUIRED",
        message: "password does not meet security requirements.",
      });
    }

    const preferredLanguage = body.preferredLanguage ?? "ar";
    if (preferredLanguage !== "ar" && preferredLanguage !== "en") {
      details.push({
        field: "preferredLanguage",
        code: "INVALID_VALUE",
        message: "preferredLanguage must be ar or en.",
      });
    }

    if (details.length > 0) {
      return fail("VALIDATION_ERROR", details[0].message, 400, {
        field: details[0].field,
        details,
      });
    }

    const emailExists = db.users.some(
      (user) => user.email.toLowerCase() === email
    );
    if (emailExists) {
      return fail(
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email already exists.",
        409,
        { field: "email" }
      );
    }

    const nationalIdExists = db.users.some(
      (user) => user.nationalId === parsedId.nationalId
    );
    if (nationalIdExists) {
      return fail(
        "NATIONAL_ID_ALREADY_REGISTERED",
        "An account with this national ID already exists.",
        409,
        { field: "nationalId" }
      );
    }

    const now = new Date().toISOString();
    const newCitizen = {
      id: nextId(),
      role: "CITIZEN",
      fullName,
      email,
      phone,
      preferredLanguage,
      nationalId: parsedId.nationalId,
      birthDate: parsedId.birthDate,
      gender: parsedId.gender,
      governorate: null,
      isActive: true,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    };

    db.users.push(newCitizen);
    setActiveMockUser(newCitizen);
    return ok(newCitizen, { status: 201 });
  }),

  // §1.3 GET /api/v1/auth/me
  http.get("/api/v1/auth/me", () => {
    const auth = requireAuthUser(true);
    if (auth.error) return auth.error;
    return ok(auth.user);
  }),

  // §1.4 PATCH /api/v1/auth/me
  http.patch("/api/v1/auth/me", async ({ request }) => {
    const auth = requireAuthUser(false);
    if (auth.error) return auth.error;

    const body = await readJsonBody(request);
    if (!body || typeof body !== "object") {
      return fail("VALIDATION_ERROR", "Malformed JSON body.", 400);
    }

    const allowedKeys = new Set(["phone", "preferredLanguage"]);
    for (const key of Object.keys(body)) {
      if (!allowedKeys.has(key)) {
        return fail("UNKNOWN_FIELD", `Unknown field: ${key}`, 400, {
          field: key,
        });
      }
    }

    if (!("phone" in body) && !("preferredLanguage" in body)) {
      return fail("VALIDATION_ERROR", "At least one field is required.", 400);
    }

    if ("phone" in body) {
      const normalized = normalizePhone(body.phone);
      if (!normalized) {
        return fail("VALIDATION_ERROR", "Invalid phone number.", 400, {
          field: "phone",
        });
      }
      auth.user.phone = normalized;
    }

    if ("preferredLanguage" in body) {
      if (body.preferredLanguage !== "ar" && body.preferredLanguage !== "en") {
        return fail("VALIDATION_ERROR", "Invalid preferredLanguage.", 400, {
          field: "preferredLanguage",
        });
      }
      auth.user.preferredLanguage = body.preferredLanguage;
    }

    auth.user.updatedAt = new Date().toISOString();
    return ok(auth.user);
  }),

  // §1.5 POST /api/v1/auth/logout (public — always returns 200 { loggedOut: true })
  http.post("/api/v1/auth/logout", () => {
    setActiveMockUser(null);
    return ok({ loggedOut: true });
  }),

  // §1.6 POST /api/v1/auth/change-password
  http.post("/api/v1/auth/change-password", async ({ request }) => {
    const auth = requireAuthUser(true);
    if (auth.error) return auth.error;

    const body = await readJsonBody(request);
    if (!body || typeof body !== "object") {
      return fail("VALIDATION_ERROR", "Malformed JSON body.", 400);
    }

    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (!currentPassword) {
      return fail("VALIDATION_ERROR", "currentPassword is required.", 400, {
        field: "currentPassword",
      });
    }
    if (currentPassword === "wrong") {
      return fail(
        "INVALID_CURRENT_PASSWORD",
        "Current password is incorrect.",
        401,
        { field: "currentPassword" }
      );
    }
    if (newPassword === currentPassword) {
      return fail(
        "PASSWORD_UNCHANGED",
        "New password must differ from current password.",
        400,
        { field: "newPassword" }
      );
    }
    if (
      !isValidPassword(newPassword, {
        email: auth.user.email,
        nationalId: auth.user.nationalId || "",
      })
    ) {
      return fail(
        "VALIDATION_ERROR",
        "New password does not meet requirements.",
        400,
        { field: "newPassword" }
      );
    }

    auth.user.mustChangePassword = false;
    auth.user.updatedAt = new Date().toISOString();
    return ok({ changed: true });
  }),

  // §1.7 POST /api/v1/auth/forgot-password
  http.post("/api/v1/auth/forgot-password", async ({ request }) => {
    const body = await readJsonBody(request);
    if (!body || typeof body !== "object" || !isValidEmail(body.email)) {
      return fail("VALIDATION_ERROR", "Valid email is required.", 400, {
        field: "email",
      });
    }
    return ok({ requested: true });
  }),

  // §1.8 POST /api/v1/auth/reset-password
  http.post("/api/v1/auth/reset-password", async ({ request }) => {
    const body = await readJsonBody(request);
    if (!body || typeof body !== "object") {
      return fail("VALIDATION_ERROR", "Malformed JSON body.", 400);
    }

    const token = String(body.token ?? "").trim();
    const newPassword = String(body.newPassword ?? "");

    if (token !== "valid-token") {
      return fail(
        "INVALID_RESET_TOKEN",
        "Reset token is invalid or expired.",
        400,
        { field: "token" }
      );
    }

    if (!isValidPassword(newPassword)) {
      return fail(
        "VALIDATION_ERROR",
        "New password does not meet requirements.",
        400,
        { field: "newPassword" }
      );
    }

    return ok({ reset: true });
  }),

  // §2.1 GET /api/v1/reference/governorates
  http.get("/api/v1/reference/governorates", () => {
    return ok(mockGovernorates);
  }),

  // §2.2 GET /api/v1/settings
  http.get("/api/v1/settings", () => {
    return ok(db.settings);
  }),

  // §2.3 GET /api/v1/health
  http.get("/api/v1/health", () => {
    return ok({ status: "ok" });
  }),

  // §3.1 GET /api/v1/services
  http.get("/api/v1/services", ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get("category");

    if (category && !VALID_CATEGORIES.has(category)) {
      return fail("VALIDATION_ERROR", "Invalid category filter.", 400, {
        field: "category",
      });
    }

    const filtered = db.services
      .filter((service) => (!category ? true : service.category === category))
      .sort((a, b) => a.name.en.localeCompare(b.name.en))
      .map(toServiceSummary);

    return ok(filtered);
  }),

  // §3.2 GET /api/v1/services/:id
  http.get("/api/v1/services/:id", ({ params }) => {
    const service = db.services.find((item) => item.id === params.id);
    if (!service) {
      return fail("SERVICE_NOT_FOUND", "Service not found.", 404);
    }
    return ok(service);
  }),

  // §8.1 GET /api/v1/admin/services (read-only foundation mock)
  http.get("/api/v1/admin/services", () => {
    const auth = requireAuthUser(false);
    if (auth.error) return auth.error;
    if (auth.user.role !== "ADMIN") {
      return fail("FORBIDDEN", "Admin role required.", 403);
    }
    const items = db.adminServices.map((service) => {
      const rest = { ...service };
      delete rest.versions;
      return rest;
    });
    return ok(items);
  }),

  // §10.2 GET /api/v1/admin/staff (read-only foundation mock)
  http.get("/api/v1/admin/staff", ({ request }) => {
    const auth = requireAuthUser(false);
    if (auth.error) return auth.error;
    if (auth.user.role !== "ADMIN") {
      return fail("FORBIDDEN", "Admin role required.", 403);
    }

    const url = new URL(request.url);
    const roleFilter = url.searchParams.get("role");
    const isActiveFilter = url.searchParams.get("isActive");
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    let staff = db.users.filter(
      (user) => user.role === "ADMIN" || user.role === "AGENT"
    );

    if (roleFilter === "ADMIN" || roleFilter === "AGENT") {
      staff = staff.filter((user) => user.role === roleFilter);
    }
    if (isActiveFilter === "true" || isActiveFilter === "false") {
      const expected = isActiveFilter === "true";
      staff = staff.filter((user) => user.isActive === expected);
    }
    if (q) {
      staff = staff.filter(
        (user) =>
          user.fullName.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q)
      );
    }

    const { data, meta } = paginate(request, staff);
    return ok(data, { meta });
  }),
];

// Auto-discover feature mocks: feature handlers first, foundation handlers last
const featureMockModules = import.meta.glob("/src/features/*/mocks.js", {
  eager: true,
});

const featureHandlers = [];

for (const moduleExports of Object.values(featureMockModules)) {
  if (Array.isArray(moduleExports.handlers)) {
    featureHandlers.push(...moduleExports.handlers);
  }
}

// Seed default services if no feature mock seeded them
if (db.adminServices.length === 0) {
  db.adminServices.push(...structuredClone(mockAdminServices));
}
if (db.services.length === 0) {
  db.services.push(...structuredClone(mockServices));
}

export { setMockRole };
export const handlers = [...featureHandlers, ...foundationHandlers];

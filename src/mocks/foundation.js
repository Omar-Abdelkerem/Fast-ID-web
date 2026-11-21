import { http } from "msw";
import { fail, ok, paginate } from "./helpers";
import { db } from "./store";
import { governorates, mockUsers, otherAgents } from "./fixtures";

// Mocks for the shared endpoints. A feature's own mocks.js is registered first, so it can override any of these.
// The mock session role comes from localStorage.mockRole (CITIZEN, ADMIN or AGENT, default ADMIN).
const currentUser = () => mockUsers[localStorage.getItem("mockRole")] || mockUsers.ADMIN;
const allUsers = () => [...Object.values(mockUsers), ...otherAgents];

// "*" so the mocks also match when VITE_API_BASE_URL is set
const api = (path) => `*/api/v1${path}`;

const toSummary = ({ id, name, description, category, fee, slaDays, validityYears, version }) => ({ id, name, description, category, fee, slaDays, validityYears, version });

export const handlers = [
  http.get(api("/health"), () => ok({ status: "ok" })),

  // ----- auth -----
  http.post(api("/auth/login"), async ({ request }) => {
    const { identifier, password } = await request.json();
    if (!identifier || !password) return fail("VALIDATION_ERROR", "identifier and password are required", 400, { field: identifier ? "password" : "identifier" });
    const user = allUsers().find((u) => u.email === identifier.toLowerCase() || u.nationalId === identifier);
    if (!user) return fail("INVALID_CREDENTIALS", "Identifier or password is incorrect.", 401);
    localStorage.setItem("mockRole", user.role);
    return ok(user);
  }),
  http.post(api("/auth/register"), async ({ request }) => {
    const body = await request.json();
    if (body.acceptTerms !== true) return fail("TERMS_NOT_ACCEPTED", "Terms must be accepted.", 400, { field: "acceptTerms" });
    localStorage.setItem("mockRole", "CITIZEN");
    return ok({ ...mockUsers.CITIZEN, fullName: body.fullName || mockUsers.CITIZEN.fullName, email: body.email || mockUsers.CITIZEN.email }, { status: 201 });
  }),
  http.get(api("/auth/me"), () => ok(currentUser())),
  http.patch(api("/auth/me"), async ({ request }) => {
    const body = await request.json();
    if (Object.keys(body).length === 0) return fail("VALIDATION_ERROR", "At least one field is required.", 400);
    return ok({ ...currentUser(), ...body });
  }),
  http.post(api("/auth/logout"), () => ok({ loggedOut: true })),
  http.post(api("/auth/change-password"), async ({ request }) => {
    const { currentPassword, newPassword } = await request.json();
    if (currentPassword === newPassword) return fail("PASSWORD_UNCHANGED", "New password equals the current one.", 400, { field: "newPassword" });
    return ok({ changed: true });
  }),
  http.post(api("/auth/forgot-password"), () => ok({ requested: true })),
  http.post(api("/auth/reset-password"), async ({ request }) => {
    const { token } = await request.json();
    if (typeof token !== "string" || token.length < 20) return fail("INVALID_RESET_TOKEN", "Token is not valid.", 400);
    return ok({ reset: true });
  }),

  // ----- reference data and settings -----
  http.get(api("/reference/governorates"), () => ok(governorates)),
  http.get(api("/settings"), () => ok(db.settings)),

  // ----- public services catalog (only published services) -----
  http.get(api("/services"), ({ request }) => {
    const category = new URL(request.url).searchParams.get("category");
    const list = db.services.filter((s) => !category || s.category === category).sort((a, b) => a.name.en.localeCompare(b.name.en));
    return ok(list.map(toSummary));
  }),
  http.get(api("/services/:id"), ({ params }) => {
    const service = db.services.find((s) => s.id === params.id);
    return service ? ok({ publishedAt: "2026-10-01T09:00:00.000Z", ...service }) : fail("SERVICE_NOT_FOUND", "Service not found.", 404);
  }),

  // ----- staff list (read only) -----
  http.get(api("/admin/staff"), ({ request }) => {
    const params = new URL(request.url).searchParams;
    let staff = allUsers().filter((u) => u.role !== "CITIZEN");
    if (params.get("role")) staff = staff.filter((u) => u.role === params.get("role"));
    if (params.get("isActive")) staff = staff.filter((u) => String(u.isActive) === params.get("isActive"));
    const q = params.get("q")?.toLowerCase();
    if (q) staff = staff.filter((u) => u.fullName.toLowerCase().includes(q) || u.email.includes(q));
    const { data, meta } = paginate(request, staff);
    return ok(data, { meta });
  }),
];

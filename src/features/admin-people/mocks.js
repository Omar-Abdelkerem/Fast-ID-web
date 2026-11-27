import { http } from "msw";
import { fail, ok, paginate } from "@/mocks/helpers";
import { db, nextId } from "@/mocks/store";
import { mockUsers, otherAgents } from "@/mocks/fixtures";

// Staff and citizens live in db.users (the full User shape). Seeded once, by id.
const citizenNames = ["منى محمد عبد الهادي", "أحمد حسن علي", "سارة محمود كمال", "يوسف علي إبراهيم", "هدى كمال سعيد", "نور إبراهيم فؤاد", "كريم سعيد محمود", "هبة محمود عادل"];
const seedCitizens = citizenNames.map((fullName, i) => ({
  ...mockUsers.CITIZEN,
  id: i === 0 ? mockUsers.CITIZEN.id : `66666666-6666-4666-8666-${String(i).padStart(12, "0")}`,
  fullName,
  email: `citizen${i}@example.com`,
  phone: `01011122${String(i).padStart(3, "0")}`,
  nationalId: `2900101012${String(i).padStart(4, "3")}`,
  isActive: i !== 5,
  createdAt: new Date(Date.UTC(2026, 9, 1 + i, 9)).toISOString(),
}));
[mockUsers.ADMIN, mockUsers.AGENT, ...otherAgents, ...seedCitizens].forEach((user) => {
  if (!db.users.some((u) => u.id === user.id)) db.users.push(user);
});

const staffOnly = () => db.users.filter((u) => u.role !== "CITIZEN");
const citizensOnly = () => db.users.filter((u) => u.role === "CITIZEN");
const currentUserId = () => (mockUsers[localStorage.getItem("mockRole")] || mockUsers.ADMIN).id;
const isTrue = (value) => value === "true";

const toCitizenItem = (u) => ({ id: u.id, fullName: u.fullName, nationalIdMasked: `${u.nationalId.slice(0, 2)}${"*".repeat(9)}${u.nationalId.slice(-2)}`, email: u.email, phone: u.phone, isActive: u.isActive, createdAt: u.createdAt });

function sortUsers(list, sort = "-createdAt") {
  const desc = sort.startsWith("-");
  const key = desc ? sort.slice(1) : sort;
  return [...list].sort((a, b) => (desc ? -1 : 1) * String(a[key]).localeCompare(String(b[key])));
}

const governorateCodes = ["CAIRO", "GIZA", "ALEXANDRIA", "QALYUBIA", "PORT_SAID", "SUEZ", "LUXOR", "ASWAN"];

export const handlers = [
  http.get("/api/v1/admin/staff", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const q = params.get("q");
    if (q && (q.length < 2 || q.length > 100)) return fail("VALIDATION_ERROR", "q must be 2 to 100 characters", 400, { field: "q" });
    let list = staffOnly();
    if (params.get("role")) list = list.filter((u) => u.role === params.get("role"));
    if (params.get("isActive")) list = list.filter((u) => u.isActive === isTrue(params.get("isActive")));
    if (q) list = list.filter((u) => u.fullName.toLowerCase().includes(q.toLowerCase()) || u.email.includes(q.toLowerCase()));
    const { data, meta } = paginate(request, sortUsers(list, params.get("sort") || undefined));
    return ok(data, { meta });
  }),

  http.post("/api/v1/admin/staff", async ({ request }) => {
    const body = await request.json();
    if (!["ADMIN", "AGENT"].includes(body.role)) return fail("VALIDATION_ERROR", "role must be ADMIN or AGENT", 400, { field: "role" });
    if (body.role === "AGENT" && !governorateCodes.includes(body.governorate)) return fail("VALIDATION_ERROR", "governorate is required for an agent", 400, { field: "governorate" });
    if (body.role === "ADMIN" && body.governorate) return fail("VALIDATION_ERROR", "governorate is not allowed for an admin", 400, { field: "governorate" });
    if (db.users.some((u) => u.email === String(body.email).toLowerCase())) return fail("EMAIL_ALREADY_REGISTERED", "Email already registered.", 409, { field: "email" });
    const now = new Date().toISOString();
    const user = {
      id: nextId(), role: body.role, fullName: body.fullName, email: String(body.email).toLowerCase(), phone: body.phone, preferredLanguage: "ar",
      nationalId: null, birthDate: null, gender: null, governorate: body.role === "AGENT" ? body.governorate : null,
      isActive: true, mustChangePassword: true, createdAt: now, updatedAt: now,
    };
    db.users.push(user);
    return ok(user, { status: 201 });
  }),

  http.patch("/api/v1/admin/staff/:id", async ({ params, request }) => {
    const user = staffOnly().find((u) => u.id === params.id);
    if (!user) return fail("USER_NOT_FOUND", "User not found.", 404);
    const body = await request.json();
    if (Object.keys(body).length === 0) return fail("VALIDATION_ERROR", "At least one field is required.", 400);
    if (body.governorate !== undefined && user.role === "ADMIN") return fail("GOVERNORATE_NOT_ALLOWED", "An admin has no governorate.", 400, { field: "governorate" });
    if (body.isActive === false) {
      if (user.id === currentUserId()) return fail("CANNOT_MODIFY_SELF", "You cannot deactivate yourself.", 409);
      const activeAdmins = staffOnly().filter((u) => u.role === "ADMIN" && u.isActive);
      if (user.role === "ADMIN" && activeAdmins.length <= 1) return fail("LAST_ADMIN", "This is the only active admin.", 409);
      const busy = db.deliveries.some((d) => d.agent?.id === user.id && ["ASSIGNED", "OUT_FOR_DELIVERY"].includes(d.status));
      if (user.role === "AGENT" && busy) return fail("AGENT_HAS_ACTIVE_DELIVERIES", "The agent has active deliveries.", 409);
    }
    Object.assign(user, body, { updatedAt: new Date().toISOString() });
    return ok(user);
  }),

  http.get("/api/v1/admin/citizens", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const q = params.get("q");
    if (q && (q.length < 3 || q.length > 100)) return fail("VALIDATION_ERROR", "q must be 3 to 100 characters", 400, { field: "q" });
    let list = citizensOnly();
    if (params.get("isActive")) list = list.filter((u) => u.isActive === isTrue(params.get("isActive")));
    if (q) list = list.filter((u) => u.nationalId === q || u.email.includes(q.toLowerCase()) || u.fullName.toLowerCase().includes(q.toLowerCase()));
    const { data, meta } = paginate(request, sortUsers(list, params.get("sort") || undefined));
    return ok(data.map(toCitizenItem), { meta });
  }),

  http.patch("/api/v1/admin/citizens/:id", async ({ params, request }) => {
    const user = citizensOnly().find((u) => u.id === params.id);
    if (!user) return fail("USER_NOT_FOUND", "User not found.", 404);
    const { isActive } = await request.json();
    if (typeof isActive !== "boolean") return fail("VALIDATION_ERROR", "isActive is required", 400, { field: "isActive" });
    user.isActive = isActive;
    user.updatedAt = new Date().toISOString();
    return ok(toCitizenItem(user));
  }),
];

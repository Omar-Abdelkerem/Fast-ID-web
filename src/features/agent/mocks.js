import { http } from "msw";
import { ok, fail, paginate } from "@/mocks/helpers";
import { db } from "@/mocks/store";
import { mockUsers } from "@/mocks/fixtures";

const agentId = mockUsers.AGENT.id;
const MAX_WRONG_TRIES = 5;

// Deliveries are shared with admin-deliveries. Seed a few only if nothing did yet.
if (db.deliveries.length === 0) {
  const statuses = ["ASSIGNED", "ASSIGNED", "OUT_FOR_DELIVERY", "FAILED_ATTEMPT", "DELIVERED"];
  statuses.forEach((status, i) => {
    const at = new Date(Date.now() - (i + 1) * 3600 * 1000 * 5).toISOString();
    db.deliveries.push({
      id: `dlv_${100 + i}`,
      applicationNumber: `FID-${20430 - i}`,
      service: { id: "national-id", name: { ar: "بطاقة الرقم القومي", en: "National ID" } },
      recipient: { fullName: ["منى محمد", "أحمد حسن", "سارة محمود"][i % 3], phone: `01012345${600 + i}`, governorate: "GIZA", city: "الدقي", addressLine: `${12 + i} شارع التحرير`, notes: i === 0 ? "الدور الثالث" : null },
      status,
      agent: { id: agentId, fullName: mockUsers.AGENT.fullName },
      attempts: status === "FAILED_ATTEMPT" ? 1 : 0,
      lastFailure: status === "FAILED_ATTEMPT" ? { reasonCode: "CITIZEN_UNAVAILABLE", reason: null, at } : null,
      assignedAt: at,
      createdAt: at,
    });
  });
}

// The 6-digit codes live only here (the API never returns them to the agent).
// Seeded "out for delivery" deliveries use 123456. For deliveries started in the mock, the code is
// also available in the browser console as window.__mockDeliveryCodes[deliveryId].
const codes = new Map();
const wrongTries = new Map();
window.__mockDeliveryCodes = Object.fromEntries(codes);
db.deliveries.filter((d) => d.status === "OUT_FOR_DELIVERY").forEach((d) => { codes.set(d.id, "123456"); window.__mockDeliveryCodes[d.id] = "123456"; });

const reasonCodes = ["CITIZEN_UNAVAILABLE", "WRONG_ADDRESS", "CITIZEN_REFUSED", "OTHER"];

// the delivery if it belongs to the mock agent
const findOwn = (id) => db.deliveries.find((d) => d.id === id && d.agent?.id === agentId);
const notFound = () => fail("DELIVERY_NOT_FOUND", "Delivery not found", 404);
const wrongStatus = () => fail("INVALID_STATUS_TRANSITION", "Invalid status transition", 409);

export const handlers = [
  http.get("/api/v1/agent/deliveries", ({ request }) => {
    const statuses = new URL(request.url).searchParams.get("status")?.split(",").filter(Boolean);
    let items = db.deliveries.filter((d) => d.agent?.id === agentId);
    if (statuses?.length) items = items.filter((d) => statuses.includes(d.status));
    items.sort((a, b) => new Date(a.assignedAt) - new Date(b.assignedAt)); // oldest first
    const { data, meta } = paginate(request, items);
    return ok(data, { meta });
  }),

  http.get("/api/v1/agent/deliveries/:id", ({ params }) => {
    const delivery = findOwn(params.id);
    return delivery ? ok(delivery) : notFound();
  }),

  http.post("/api/v1/agent/deliveries/:id/start", ({ params }) => {
    const delivery = findOwn(params.id);
    if (!delivery) return notFound();
    if (delivery.status !== "ASSIGNED") return wrongStatus();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    codes.set(delivery.id, code);
    wrongTries.set(delivery.id, 0);
    window.__mockDeliveryCodes[delivery.id] = code;
    delivery.status = "OUT_FOR_DELIVERY";
    return ok(delivery);
  }),

  http.post("/api/v1/agent/deliveries/:id/deliver", async ({ params, request }) => {
    const delivery = findOwn(params.id);
    if (!delivery) return notFound();
    if (delivery.status !== "OUT_FOR_DELIVERY") return wrongStatus();
    const { code } = await request.json();
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) return fail("VALIDATION_ERROR", "Code must be 6 digits", 400, { field: "code" });
    const tries = wrongTries.get(delivery.id) || 0;
    if (tries >= MAX_WRONG_TRIES) return fail("DELIVERY_CODE_LOCKED", "Code is locked", 423);
    if (code !== codes.get(delivery.id)) {
      wrongTries.set(delivery.id, tries + 1);
      // the 5th wrong try locks the code
      return tries + 1 >= MAX_WRONG_TRIES ? fail("DELIVERY_CODE_LOCKED", "Code is locked", 423) : fail("INVALID_DELIVERY_CODE", "Wrong code", 400);
    }
    delivery.status = "DELIVERED";
    return ok(delivery);
  }),

  http.post("/api/v1/agent/deliveries/:id/fail", async ({ params, request }) => {
    const delivery = findOwn(params.id);
    if (!delivery) return notFound();
    if (delivery.status !== "OUT_FOR_DELIVERY") return wrongStatus();
    const { reasonCode, reason } = await request.json();
    if (!reasonCodes.includes(reasonCode)) return fail("VALIDATION_ERROR", "Invalid reasonCode", 400, { field: "reasonCode" });
    const text = typeof reason === "string" ? reason.trim() : "";
    if (reasonCode === "OTHER" && (text.length < 5 || text.length > 300)) return fail("VALIDATION_ERROR", "reason must be 5 to 300 characters", 400, { field: "reason" });
    if (text.length > 300) return fail("VALIDATION_ERROR", "reason is too long", 400, { field: "reason" });
    delivery.status = "FAILED_ATTEMPT";
    delivery.attempts += 1;
    delivery.lastFailure = { reasonCode, reason: text || null, at: new Date().toISOString() };
    return ok(delivery);
  }),
];

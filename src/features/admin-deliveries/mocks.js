import { http } from "msw";
import { ok, fail, paginate } from "@/mocks/helpers";
import { db } from "@/mocks/store";
import { mockUsers, otherAgents } from "@/mocks/fixtures";

const serviceNames = {
  "national-id": { ar: "بطاقة الرقم القومي", en: "National ID" },
  "driving-license": { ar: "رخصة القيادة", en: "Driving license" },
};

const agentA = { id: mockUsers.AGENT.id, fullName: mockUsers.AGENT.fullName };
const agentB = { id: otherAgents[0].id, fullName: otherAgents[0].fullName };

const places = [
  ["CAIRO", "مدينة نصر", "شارع النصر"],
  ["GIZA", "المعادي", "شارع 9"],
  ["GIZA", "الدقي", "شارع التحرير"],
  ["ALEXANDRIA", "سموحة", "شارع فوزي معاذ"],
  ["CAIRO", "الهرم", "شارع الملك فيصل"],
];

// [status, agent, attempts, failed]
const seedRows = [
  ["PENDING_ASSIGNMENT", null, 0], ["PENDING_ASSIGNMENT", null, 0], ["ASSIGNED", agentA, 0],
  ["ASSIGNED", agentA, 0], ["OUT_FOR_DELIVERY", agentA, 0], ["OUT_FOR_DELIVERY", agentB, 0],
  ["FAILED_ATTEMPT", agentA, 1], ["FAILED_ATTEMPT", agentB, 2], ["DELIVERED", agentA, 0], ["DELIVERED", agentB, 0],
  ["ASSIGNED", agentA, 0], ["DELIVERED", agentA, 0],
];

// Seed ~10 deliveries across all statuses (only once; the agent mocks use the same db.deliveries)
if (db.deliveries.length === 0) {
  seedRows.forEach(([status, agent, attempts], i) => {
    const [governorate, city, addressLine] = places[i % places.length];
    const created = new Date(Date.now() - (i + 1) * 3600 * 1000 * 5).toISOString();
    db.deliveries.push({
      id: `dlv_${100 + i}`,
      applicationNumber: `FID-${20430 - i}`,
      service: { id: i % 2 ? "driving-license" : "national-id", name: serviceNames[i % 2 ? "driving-license" : "national-id"] },
      recipient: {
        fullName: ["منى محمد عبد الهادي", "أحمد حسن", "سارة محمود", "يوسف علي"][i % 4],
        phone: `01012345${600 + i}`,
        governorate,
        city,
        addressLine: `${12 + i} ${addressLine}`,
        notes: i % 3 === 0 ? "الدور الثالث، الشقة 5" : null,
      },
      status,
      agent,
      attempts,
      lastFailure: attempts > 0 ? { reasonCode: "CITIZEN_UNAVAILABLE", reason: "المواطن غير موجود في المنزل", at: created } : null,
      assignedAt: agent ? created : null,
      createdAt: created,
    });
  });
}

const canAssign = ["PENDING_ASSIGNMENT", "ASSIGNED", "FAILED_ATTEMPT"];

export const handlers = [
  http.get("/api/v1/admin/deliveries", ({ request }) => {
    const params = new URL(request.url).searchParams;
    const statuses = params.get("status")?.split(",").filter(Boolean);
    let items = [...db.deliveries];
    if (statuses?.length) items = items.filter((d) => statuses.includes(d.status));
    if (params.get("governorate")) items = items.filter((d) => d.recipient.governorate === params.get("governorate"));
    if (params.get("agentId")) items = items.filter((d) => d.agent?.id === params.get("agentId"));
    if (params.get("unassigned") === "true") items = items.filter((d) => d.status === "PENDING_ASSIGNMENT");
    // default sort is -createdAt (newest first)
    const direction = params.get("sort") === "createdAt" ? 1 : -1;
    items.sort((a, b) => direction * (new Date(a.createdAt) - new Date(b.createdAt)));
    const { data, meta } = paginate(request, items);
    return ok(data, { meta });
  }),

  http.get("/api/v1/admin/deliveries/:id", ({ params }) => {
    const delivery = db.deliveries.find((d) => d.id === params.id);
    return delivery ? ok(delivery) : fail("DELIVERY_NOT_FOUND", "Delivery not found", 404);
  }),

  http.post("/api/v1/admin/deliveries/:id/assign", async ({ params, request }) => {
    const delivery = db.deliveries.find((d) => d.id === params.id);
    if (!delivery) return fail("DELIVERY_NOT_FOUND", "Delivery not found", 404);
    const { agentId } = await request.json();
    if (typeof agentId !== "string" || !agentId) return fail("VALIDATION_ERROR", "agentId is required", 400, { field: "agentId" });
    const agent = [mockUsers.AGENT, ...otherAgents].find((a) => a.id === agentId);
    if (!agent) return fail("AGENT_NOT_FOUND", "Agent not found", 404, { field: "agentId" });
    if (!canAssign.includes(delivery.status)) return fail("INVALID_STATUS_TRANSITION", "Cannot assign in this status", 409);
    delivery.agent = { id: agent.id, fullName: agent.fullName };
    delivery.status = "ASSIGNED";
    delivery.assignedAt = new Date().toISOString();
    return ok(delivery);
  }),
];

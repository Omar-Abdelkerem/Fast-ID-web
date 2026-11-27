import { http } from "msw";
import { ok, fail, paginate } from "@/mocks/helpers";
import { db } from "@/mocks/store";
import { mockUsers } from "@/mocks/fixtures";

const SEED_NOTIFICATIONS = [
  {
    id: "11111111-1111-4111-8111-000000000001",
    type: "DELIVERY_OUT_FOR_DELIVERY",
    title: { ar: "بطاقتك في الطريق إليك", en: "Your card is out for delivery" },
    body: {
      ar: "المندوب كريم أحمد في طريقه لتسليم الطلب APP-2026-000101. كود التسليم متاح في تفاصيل الطلب.",
      en: "Agent Karim Ahmed is on the way for APP-2026-000101. Your delivery code is in the app.",
    },
    entity: { type: "APPLICATION", id: "22222222-2222-4222-8222-000000000001" },
    isRead: false,
    readAt: null,
    createdAt: "2026-11-23T12:15:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000002",
    type: "APPLICATION_APPROVED",
    title: { ar: "تمت الموافقة على طلبك", en: "Your application was approved" },
    body: {
      ar: "تمت الموافقة على طلب بطاقة الرقم القومي وإصدار البطاقة رقم CRD-98K2M4P1QX.",
      en: "Your National ID application was approved and credential CRD-98K2M4P1QX was issued.",
    },
    entity: { type: "APPLICATION", id: "22222222-2222-4222-8222-000000000001" },
    isRead: false,
    readAt: null,
    createdAt: "2026-11-22T15:40:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000003",
    type: "APPLICATION_UNDER_REVIEW",
    title: { ar: "طلبك قيد المراجعة الآن", en: "Your application is under review" },
    body: {
      ar: "بدأ أحد المراجعين فحص مستندات الطلب APP-2026-000101.",
      en: "A reviewer has started checking the documents for APP-2026-000101.",
    },
    entity: { type: "APPLICATION", id: "22222222-2222-4222-8222-000000000001" },
    isRead: false,
    readAt: null,
    createdAt: "2026-11-21T10:20:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000004",
    type: "APPLICATION_SUBMITTED",
    title: { ar: "تم استلام طلبك بنجاح", en: "We received your application" },
    body: {
      ar: "تم تسجيل الطلب APP-2026-000101 بنجاح وسيتم مراجعته خلال 3 أيام.",
      en: "Application APP-2026-000101 has been submitted and will be reviewed within 3 days.",
    },
    entity: { type: "APPLICATION", id: "22222222-2222-4222-8222-000000000001" },
    isRead: true,
    readAt: "2026-11-20T11:00:00.000Z",
    createdAt: "2026-11-20T09:15:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000005",
    type: "APPLICATION_REJECTED",
    title: { ar: "تم رفض الطلب", en: "Application rejected" },
    body: {
      ar: "تم رفض الطلب APP-2026-000095 بسبب عدم وضوح صورة شهادة الميلاد.",
      en: "Application APP-2026-000095 was rejected because the birth certificate image was unclear.",
    },
    entity: { type: "APPLICATION", id: "22222222-2222-4222-8222-000000000002" },
    isRead: false,
    readAt: null,
    createdAt: "2026-11-19T14:30:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000006",
    type: "DELIVERY_FAILED_ATTEMPT",
    title: { ar: "تعذر تسليم البطاقة", en: "Delivery attempt failed" },
    body: {
      ar: "لم نتمكن من تسليم الطلب APP-2026-000088 لعدم التواجد في العنوان. سيتم إعادة الجدولة.",
      en: "Delivery for APP-2026-000088 failed (recipient unavailable). It will be rescheduled.",
    },
    entity: { type: "APPLICATION", id: "22222222-2222-4222-8222-000000000003" },
    isRead: true,
    readAt: "2026-11-18T18:00:00.000Z",
    createdAt: "2026-11-18T16:10:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000007",
    type: "DELIVERY_COMPLETED",
    title: { ar: "تم تسليم بطاقتك بنجاح", en: "Your card has been delivered" },
    body: {
      ar: "تم تأكيد تسليم الطلب APP-2026-000080 باستخدام كود التسليم.",
      en: "Delivery of application APP-2026-000080 has been confirmed with the delivery code.",
    },
    entity: { type: "APPLICATION", id: "22222222-2222-4222-8222-000000000004" },
    isRead: true,
    readAt: "2026-11-17T12:00:00.000Z",
    createdAt: "2026-11-17T11:30:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000008",
    type: "APPLICATION_CANCELLED",
    title: { ar: "تم إلغاء الطلب", en: "Application cancelled" },
    body: {
      ar: "تم إلغاء الطلب APP-2026-000072 بناءً على رغبتك.",
      en: "Application APP-2026-000072 has been cancelled at your request.",
    },
    entity: { type: "APPLICATION", id: "22222222-2222-4222-8222-000000000005" },
    isRead: true,
    readAt: "2026-11-16T09:45:00.000Z",
    createdAt: "2026-11-16T09:00:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000009",
    type: "CREDENTIAL_REVOKED",
    title: { ar: "تم إلغاء صلاحية بطاقة", en: "Credential revoked" },
    body: {
      ar: "تم إلغاء البطاقة السابقة المرتبطة بالطلب APP-2026-000060.",
      en: "The previous credential linked to APP-2026-000060 has been revoked.",
    },
    entity: { type: "APPLICATION", id: "22222222-2222-4222-8222-000000000006" },
    isRead: true,
    readAt: "2026-11-15T13:00:00.000Z",
    createdAt: "2026-11-15T12:10:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000010",
    type: "APPLICATION_SUBMITTED",
    title: { ar: "تم استلام طلب شهادة الميلاد", en: "Birth certificate application received" },
    body: {
      ar: "تم تسجيل الطلب APP-2026-000055 بنجاح.",
      en: "Application APP-2026-000055 has been submitted successfully.",
    },
    entity: { type: "APPLICATION", id: "22222222-2222-4222-8222-000000000007" },
    isRead: true,
    readAt: "2026-11-14T10:00:00.000Z",
    createdAt: "2026-11-14T08:30:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000011",
    type: "DELIVERY_ASSIGNED",
    title: { ar: "تم تعيين مهمة توصيل جديدة", en: "New delivery assigned to you" },
    body: {
      ar: "تم تعيين الطلب APP-2026-000101 للتوصيل في مدينة نصر، القاهرة.",
      en: "Application APP-2026-000101 has been assigned to you for delivery in Nasr City, Cairo.",
    },
    entity: { type: "DELIVERY", id: "33333333-3333-4333-8333-000000000001" },
    isRead: false,
    readAt: null,
    createdAt: "2026-11-23T11:00:00.000Z",
  },
  {
    id: "11111111-1111-4111-8111-000000000012",
    type: "DELIVERY_ASSIGNED",
    title: { ar: "مهمة توصيل جديدة في المعادي", en: "New delivery assigned in Maadi" },
    body: {
      ar: "تم تعيين الطلب APP-2026-000099 للتوصيل في المعادي، القاهرة.",
      en: "Application APP-2026-000099 has been assigned to you for delivery in Maadi, Cairo.",
    },
    entity: { type: "DELIVERY", id: "33333333-3333-4333-8333-000000000002" },
    isRead: true,
    readAt: "2026-11-22T14:00:00.000Z",
    createdAt: "2026-11-22T13:15:00.000Z",
  },
];

// Seed notifications are private to the matching fixture account. A second
// mock citizen/agent (same role, different user id) must not see them.
const seededOwners = new Map(
  SEED_NOTIFICATIONS.map((notification) => [
    notification.id,
    notification.entity.type === "DELIVERY" ? mockUsers.AGENT.id : mockUsers.CITIZEN.id,
  ])
);

// Prefer the UUID from the existing app/delivery fixtures (where available)
// so notification links lead to real mock records, not just placeholder UUIDs.
function resolveSeedEntityId(notification) {
  const applicationNumber = notification.body.en.match(/APP-\d{4}-\d{6}/)?.[0];
  const collection = notification.entity.type === "DELIVERY" ? db.deliveries : db.applications;
  const matching = (collection || []).find((item) => item.applicationNumber === applicationNumber);
  const isUuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return matching && isUuidV4.test(matching.id) ? matching.id : notification.entity.id;
}

if (db.notifications.length === 0) {
  db.notifications.push(...SEED_NOTIFICATIONS.map((item) => ({
    ...item,
    entity: { ...item.entity, id: resolveSeedEntityId(item) },
  })));
}

function getScopedNotifications() {
  const role =
    (typeof window !== "undefined" && window.localStorage?.getItem("mockRole")) ||
    "CITIZEN";
  // Allows tests to switch between two accounts with the same role. The
  // default matches the existing single-account mock auth fixtures.
  const userId =
    (typeof window !== "undefined" && window.localStorage?.getItem("mockUserId")) ||
    mockUsers[role]?.id;
  if (!userId) return [];
  return db.notifications.filter(
    (notification) => (notification.ownerId || seededOwners.get(notification.id)) === userId
  );
}

function publicNotification(notification) {
  // ownerId is mock-server bookkeeping; it is not in the API's Notification schema.
  // eslint-disable-next-line no-unused-vars
  const { ownerId, ...visible } = notification;
  return visible;
}

export const handlers = [
  http.get("/api/v1/notifications", ({ request }) => {
    const url = new URL(request.url);
    const isReadParam = url.searchParams.get("isRead");

    let items = [...getScopedNotifications()].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    if (isReadParam === "true") {
      items = items.filter((n) => n.isRead);
    } else if (isReadParam === "false") {
      items = items.filter((n) => !n.isRead);
    }

    const { data, meta } = paginate(request, items);
    return ok(data.map(publicNotification), { meta });
  }),

  http.get("/api/v1/notifications/unread-count", () => {
    const count = getScopedNotifications().filter((n) => !n.isRead).length;
    return ok({ count });
  }),

  http.post("/api/v1/notifications/:id/read", ({ params }) => {
    const item = getScopedNotifications().find((n) => n.id === params.id);
    if (!item) {
      return fail("NOTIFICATION_NOT_FOUND", "Notification not found.", 404);
    }
    if (!item.isRead) {
      item.isRead = true;
      item.readAt = new Date().toISOString();
    }
    return ok(publicNotification(item));
  }),

  http.post("/api/v1/notifications/read-all", () => {
    const now = new Date().toISOString();
    let updated = 0;
    for (const item of getScopedNotifications()) {
      if (!item.isRead) {
        item.isRead = true;
        item.readAt = now;
        updated += 1;
      }
    }
    return ok({ updated });
  }),
];

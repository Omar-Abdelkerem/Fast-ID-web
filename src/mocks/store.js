// In-memory data shared by every feature's mocks. It resets on page reload.
export const db = {
  users: [],
  services: [], // public, published definitions
  adminServices: [], // admin view: draft + versions
  applications: [],
  credentials: [],
  deliveries: [],
  notifications: [],
  auditLogs: [],
  settings: {
    id: "singleton",
    supportEmail: "support@example.com",
    supportPhone: "01000000000",
    announcement: null,
    updatedAt: "2026-10-01T09:00:00.000Z",
  },
};

// ids are UUID v4
export const nextId = () => crypto.randomUUID();

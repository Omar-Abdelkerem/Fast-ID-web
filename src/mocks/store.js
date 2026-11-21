import { mockSettings, mockUsers, otherAgents } from "./fixtures";

let idCounter = 1000;

export function nextId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  idCounter += 1;
  const suffix = String(idCounter).padStart(12, "0");
  return `00000000-0000-4000-8000-${suffix}`;
}

export const db = {
  users: [
    structuredClone(mockUsers.CITIZEN),
    structuredClone(mockUsers.ADMIN),
    structuredClone(mockUsers.AGENT),
    ...otherAgents.map((agent) => structuredClone(agent)),
  ],
  services: [],
  adminServices: [],
  applications: [],
  credentials: [],
  deliveries: [],
  notifications: [],
  auditLogs: [],
  settings: structuredClone(mockSettings),
};

const VALID_ROLES = new Set(["CITIZEN", "ADMIN", "AGENT"]);
let activeMockUser = undefined;

export function getStoredMockRole() {
  try {
    const role = window.localStorage.getItem("mockRole");
    if (role && VALID_ROLES.has(role)) {
      return role;
    }
  } catch {
    // Ignore storage access errors
  }
  return null;
}

export function getActiveMockUser() {
  if (activeMockUser === undefined) {
    const storedRole = getStoredMockRole();
    if (storedRole) {
      activeMockUser =
        db.users.find((u) => u.id === mockUsers[storedRole].id) ||
        mockUsers[storedRole];
    } else {
      activeMockUser = null;
    }
  }
  return activeMockUser;
}

export function setActiveMockUser(user) {
  activeMockUser = user || null;
  try {
    if (user?.role && VALID_ROLES.has(user.role)) {
      window.localStorage.setItem("mockRole", user.role);
    } else {
      window.localStorage.removeItem("mockRole");
    }
  } catch {
    // Ignore storage access errors
  }
}

export function setMockRole(role) {
  if (!role || !VALID_ROLES.has(role)) {
    setActiveMockUser(null);
    return null;
  }
  const user =
    db.users.find((u) => u.id === mockUsers[role].id) || mockUsers[role];
  setActiveMockUser(user);
  return user;
}

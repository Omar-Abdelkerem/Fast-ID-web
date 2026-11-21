import { getRoleHome } from "./auth";

// Every feature registers its own routes and menu entries in src/features/<feature>/routes.jsx:
//   export const routes = [{ path, layout, element, roles? }];
//   export const nav = [{ layout, to, labelKey: "namespace:key", order }];
// layout: "public" | "citizen" | "admin" | "agent" | "shared"
const modules = import.meta.glob("../features/*/routes.jsx", { eager: true });

export const routes = Object.values(modules).flatMap((module) => module.routes || []);

const navEntries = Object.values(modules).flatMap((module) => module.nav || []);

const byOrder = (a, b) => a.order - b.order;

// entries that belong to one layout only
const ownNavFor = (layout) => navEntries.filter((entry) => entry.layout === layout).sort(byOrder);

// the menu of a layout: its own entries plus the "shared" ones (notifications, profile...), lowest order first
export const navFor = (layout) =>
  navEntries.filter((entry) => entry.layout === layout || (entry.layout === "shared" && layout !== "public")).sort(byOrder);

// the layout each role works in
const layoutOfRole = { ADMIN: "admin", AGENT: "agent", CITIZEN: "citizen" };

// The role's home page if some feature provides it. Otherwise (for example while the dashboard of another
// package is not built yet) the first menu entry of the role, so nobody lands on a 404 page.
export function getAvailableHome(role) {
  const home = getRoleHome(role);
  if (routes.some((route) => route.path === home)) return home;
  return ownNavFor(layoutOfRole[role])[0]?.to || home;
}

// menu entries of every role, used by the demo page that lists what already exists
export const allNavEntries = () => navEntries.filter((entry) => layoutToRole[entry.layout]);
const layoutToRole = { admin: "ADMIN", agent: "AGENT", citizen: "CITIZEN" };
export const roleOfLayoutName = (layout) => layoutToRole[layout];

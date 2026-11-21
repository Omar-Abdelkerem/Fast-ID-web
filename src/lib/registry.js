import { getRoleHome } from "./auth";

// Every feature registers its own routes and menu entries in src/features/<feature>/routes.jsx:
//   export const routes = [{ path, layout, element, roles? }];
//   export const nav = [{ layout, to, labelKey: "namespace:key", order }];
// layout: "public" | "citizen" | "admin" | "agent" | "shared"
const modules = import.meta.glob("../features/*/routes.jsx", { eager: true });

export const routes = Object.values(modules).flatMap((module) => module.routes || []);

const navEntries = Object.values(modules).flatMap((module) => module.nav || []);

// menu entries of one layout, lowest order first
export const navFor = (layout) => navEntries.filter((entry) => entry.layout === layout).sort((a, b) => a.order - b.order);

// the layout each role works in
const layoutOfRole = { ADMIN: "admin", AGENT: "agent", CITIZEN: "citizen" };

// The role's home page if some feature provides it. Otherwise (for example while the dashboard of another
// package is not built yet) the first menu entry of the role, so nobody lands on a 404 page.
export function getAvailableHome(role) {
  const home = getRoleHome(role);
  if (routes.some((route) => route.path === home)) return home;
  return navFor(layoutOfRole[role])[0]?.to || home;
}

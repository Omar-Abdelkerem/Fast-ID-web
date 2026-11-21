// Every feature registers its own routes and menu entries in src/features/<feature>/routes.jsx:
//   export const routes = [{ path, layout, element, roles? }];
//   export const nav = [{ layout, to, labelKey: "namespace:key", order }];
// layout: "public" | "citizen" | "admin" | "agent" | "shared"
const modules = import.meta.glob("../features/*/routes.jsx", { eager: true });

export const routes = Object.values(modules).flatMap((module) => module.routes || []);

const navEntries = Object.values(modules).flatMap((module) => module.nav || []);

// menu entries of one layout, lowest order first
export const navFor = (layout) => navEntries.filter((entry) => entry.layout === layout).sort((a, b) => a.order - b.order);

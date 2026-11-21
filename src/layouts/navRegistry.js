// Auto-discover feature navigation items from src/features/*/routes.jsx
const featureRouteModules = import.meta.glob("/src/features/*/routes.jsx", {
  eager: true,
});

const allNavItems = [];

for (const moduleExports of Object.values(featureRouteModules)) {
  if (Array.isArray(moduleExports.nav)) {
    for (const item of moduleExports.nav) {
      if (item && item.layout && item.to && item.labelKey) {
        allNavItems.push(item);
      }
    }
  }
}

export function getNavItems(layout) {
  const isAuthenticatedShell =
    layout === "citizen" || layout === "admin" || layout === "agent";

  return allNavItems
    .filter(
      (item) =>
        item.layout === layout ||
        (isAuthenticatedShell && item.layout === "shared")
    )
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

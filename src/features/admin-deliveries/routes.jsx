import DeliveriesPage from "./pages/DeliveriesPage";

export const routes = [
  { path: "/admin/deliveries", layout: "admin", element: <DeliveriesPage /> },
];

export const nav = [
  { layout: "admin", to: "/admin/deliveries", labelKey: "admin-deliveries:nav.title", order: 30 },
];

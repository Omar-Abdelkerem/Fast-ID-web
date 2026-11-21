import DeliveriesPage from "./pages/DeliveriesPage";
import DeliveryDetailPage from "./pages/DeliveryDetailPage";

export const routes = [
  { path: "/agent/deliveries", layout: "agent", element: <DeliveriesPage /> },
  { path: "/agent/deliveries/:deliveryId", layout: "agent", element: <DeliveryDetailPage /> },
];

export const nav = [
  { layout: "agent", to: "/agent/deliveries", labelKey: "agent:nav.title", order: 10 },
];

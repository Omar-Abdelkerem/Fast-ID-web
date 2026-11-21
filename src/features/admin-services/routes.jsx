import ServicesListPage from "./pages/ServicesListPage";
import ServiceEditorPage from "./pages/ServiceEditorPage";

export const routes = [
  { path: "/admin/services", layout: "admin", element: <ServicesListPage /> },
  { path: "/admin/services/new", layout: "admin", element: <ServiceEditorPage /> },
  { path: "/admin/services/:serviceId", layout: "admin", element: <ServiceEditorPage /> },
];

export const nav = [
  { layout: "admin", to: "/admin/services", labelKey: "admin-services:nav.title", order: 20 },
];

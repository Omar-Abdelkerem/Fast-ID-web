import ServicesListPage from "./pages/ServicesListPage";

export const routes = [
  { path: "/admin/services", layout: "admin", element: <ServicesListPage /> },
];

export const nav = [
  { layout: "admin", to: "/admin/services", labelKey: "admin-services:nav.title", order: 20 },
];

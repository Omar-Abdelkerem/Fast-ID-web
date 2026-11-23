import StaffPage from "./pages/StaffPage";
import CitizensPage from "./pages/CitizensPage";

export const routes = [
  { path: "/admin/staff", layout: "admin", element: <StaffPage /> },
  { path: "/admin/citizens", layout: "admin", element: <CitizensPage /> },
];

export const nav = [
  { layout: "admin", to: "/admin/staff", labelKey: "admin-people:nav.staff", order: 40 },
  { layout: "admin", to: "/admin/citizens", labelKey: "admin-people:nav.citizens", order: 50 },
];

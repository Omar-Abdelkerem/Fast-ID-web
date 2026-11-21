import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";

export const routes = [
  { path: "/admin", layout: "admin", element: <DashboardPage /> },
  { path: "/admin/settings", layout: "admin", element: <SettingsPage /> },
];

export const nav = [
  { layout: "admin", to: "/admin", labelKey: "admin-dashboard:nav.dashboard", order: 1 },
  { layout: "admin", to: "/admin/settings", labelKey: "admin-dashboard:nav.settings", order: 90 },
];

import AuditLogsPage from "./pages/AuditLogsPage";

export const routes = [{ path: "/admin/audit-logs", layout: "admin", element: <AuditLogsPage /> }];

export const nav = [{ layout: "admin", to: "/admin/audit-logs", labelKey: "audit-logs:nav.title", order: 60 }];

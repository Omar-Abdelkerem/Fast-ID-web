import { SidebarShell } from "./SidebarShell";

export function AdminLayout({ children }) {
  return (
    <SidebarShell layout="admin" homePath="/admin">
      {children}
    </SidebarShell>
  );
}

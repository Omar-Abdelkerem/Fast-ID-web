import { SidebarShell } from "./SidebarShell";

export function CitizenLayout({ children }) {
  return (
    <SidebarShell layout="citizen" homePath="/applications">
      {children}
    </SidebarShell>
  );
}

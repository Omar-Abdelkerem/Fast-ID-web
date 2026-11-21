import { useAuth } from "@/lib/auth";
import { AdminLayout } from "./AdminLayout";
import { AgentLayout } from "./AgentLayout";
import { CitizenLayout } from "./CitizenLayout";

export function SharedLayout({ children }) {
  const { user } = useAuth();

  if (user?.role === "ADMIN") {
    return <AdminLayout>{children}</AdminLayout>;
  }
  if (user?.role === "AGENT") {
    return <AgentLayout>{children}</AgentLayout>;
  }
  return <CitizenLayout>{children}</CitizenLayout>;
}

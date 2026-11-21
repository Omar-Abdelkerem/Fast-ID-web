import AdminLayout from "./AdminLayout";
import AgentLayout from "./AgentLayout";
import CitizenLayout from "./CitizenLayout";
import PublicLayout from "./PublicLayout";

// the shell of each role; "shared" routes use the shell of the signed-in user's role
export const layoutByLayout = { admin: AdminLayout, agent: AgentLayout, citizen: CitizenLayout, public: PublicLayout };
export const layoutByRole = { ADMIN: AdminLayout, AGENT: AgentLayout, CITIZEN: CitizenLayout };

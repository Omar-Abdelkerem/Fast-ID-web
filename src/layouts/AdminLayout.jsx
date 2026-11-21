import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { navFor } from "@/lib/registry";
import { useAuth } from "@/lib/auth";
import { USE_MOCKS } from "@/lib/env";
import { SidebarSettings } from "@/components/Switchers";
import MockRoleSwitcher from "@/components/MockRoleSwitcher";

// Desktop layout: a sticky sidebar on the side, language and theme switches at its bottom (design deck, admin screens)
export default function AdminLayout({ children }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex w-full shrink-0 flex-col bg-espresso p-4 text-white md:sticky md:top-0 md:h-screen md:w-56 md:overflow-y-auto">
        <div className="mb-4 flex items-center gap-2 font-heading text-xl font-bold">
          <span className="rounded-lg bg-white/20 px-2 py-0.5 text-base">ID</span> Fast
        </div>

        <nav className="flex gap-2 overflow-x-auto md:flex-col" aria-label="main">
          {navFor("admin").map((entry) => (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.to === "/admin"}
              className={({ isActive }) =>
                `block whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors ${isActive ? "bg-terracotta-dark font-semibold" : "hover:bg-white/10"}`
              }
            >
              {t(entry.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* settings stay at the bottom of the sidebar */}
        <div className="mt-4 space-y-3 md:mt-auto md:pt-6">
          <SidebarSettings />
          <MockRoleSwitcher />
          {user && !USE_MOCKS && (
            <div className="flex items-center justify-between gap-2 text-xs text-white/80">
              <span className="truncate">{user.fullName}</span>
              <button type="button" className="underline" onClick={logout}>
                {t("logout")}
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}

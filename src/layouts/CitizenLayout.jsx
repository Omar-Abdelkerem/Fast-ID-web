import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { navFor } from "@/lib/registry";
import { useAuth } from "@/lib/auth";
import { USE_MOCKS } from "@/lib/env";
import { LanguageSwitcher, ThemeSwitcher } from "@/components/Switchers";
import MockRoleSwitcher from "@/components/MockRoleSwitcher";

// Citizen layout: top bar with the menu, content centred below
export default function CitizenLayout({ children }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="bg-espresso text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 p-3">
          <span className="font-heading text-lg font-bold">Fast ID</span>
          <nav className="flex flex-wrap gap-1" aria-label="main">
            {navFor("citizen").map((entry) => (
              <NavLink
                key={entry.to}
                to={entry.to}
                className={({ isActive }) => `rounded-xl px-3 py-1.5 text-sm ${isActive ? "bg-terracotta-dark font-semibold" : "hover:bg-white/10"}`}
              >
                {t(entry.labelKey)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
            {user && !USE_MOCKS && (
              <button type="button" className="text-xs underline" onClick={logout}>
                {t("logout")}
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        {children}
        <MockRoleSwitcher className="mt-8 max-w-[10rem] rounded-xl bg-espresso p-2 text-white" />
      </main>
    </div>
  );
}

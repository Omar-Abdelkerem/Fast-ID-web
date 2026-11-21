import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { navFor } from "@/lib/registry";
import { LanguageSwitcher, ThemeSwitcher } from "@/components/Switchers";
import MockRoleSwitcher from "@/components/MockRoleSwitcher";
import NotificationSlot from "@/components/NotificationSlot";
import AnnouncementBanner from "@/components/AnnouncementBanner";

// Phone layout for delivery agents: header on top, bottom navigation, single column
export default function AgentLayout({ children }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl">
      <header className="flex items-center justify-between gap-2 bg-espresso p-3 text-white">
        <span className="font-heading text-lg font-bold">Fast ID</span>
        <div className="flex items-center gap-2">
          <NotificationSlot />
          <LanguageSwitcher />
          <ThemeSwitcher />
        </div>
      </header>

      <main className="p-4 pb-28">
        <AnnouncementBanner />
        {children}
        <MockRoleSwitcher className="mt-8 max-w-[10rem] rounded-xl bg-espresso p-2 text-white" />
      </main>

      <nav
        aria-label="main"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-2xl border-t border-line bg-white dark:border-[#2f3670] dark:bg-[#1b2048]"
      >
        {navFor("agent").map((entry) => (
          <NavLink
            key={entry.to}
            to={entry.to}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-1 items-center justify-center text-sm font-semibold ${isActive ? "text-terracotta-dark dark:text-[#8da0ff]" : "text-muted"}`
            }
          >
            {t(entry.labelKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

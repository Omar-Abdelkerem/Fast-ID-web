import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { LanguageSwitcher, ThemeSwitcher } from "@/components";
import { BrandLogo } from "@/components/BrandLogo";
import { getNavItems } from "./navRegistry";
import { OptionalNotificationBell } from "./OptionalNotificationBell";
import { OptionalDevRoleSwitcher } from "./OptionalDevRoleSwitcher";

export function AgentLayout({ children }) {
  const { t } = useTranslation("common");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const mustChangePassword = Boolean(user?.mustChangePassword);
  const navItems = mustChangePassword ? [] : getNavItems("agent");

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-page pb-20 text-navy dark:bg-[#111533] dark:text-sky">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-blue focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t("app.skipToContent")}
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-sm dark:border-[#2f3670] dark:bg-[#181d42]/95">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
          <Link
            to={mustChangePassword ? "/change-password" : "/agent/deliveries"}
            aria-label={t("app.name")}
          >
            <BrandLogo variant="light" />
          </Link>

          <div className="flex items-center gap-2">
            <OptionalNotificationBell />
            <ThemeSwitcher />
            <LanguageSwitcher />
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="btn-danger btn-sm"
            >
              {t("buttons.logout")}
            </button>
          </div>
        </div>
      </header>

      {mustChangePassword ? (
        <div
          role="alert"
          className="border-b border-warning/25 bg-warning-bg px-4 py-2.5 text-sm font-semibold text-warning-dark"
        >
          <div className="mx-auto max-w-2xl">
            {t("nav.passwordChangeRequiredBanner")}
          </div>
        </div>
      ) : null}

      <main
        id="main-content"
        className="mx-auto w-full max-w-2xl flex-1 px-4 py-5"
      >
        {children || <Outlet />}
      </main>

      <div className="mx-auto w-full max-w-2xl">
        <OptionalDevRoleSwitcher />
      </div>

      {/* Case Study mobile bottom tab bar with Royal Blue active pill (Page 15) */}
      <nav
        aria-label={t("nav.mainNav")}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white shadow-sm dark:border-[#2f3670] dark:bg-[#181d42]"
      >
        <div className="mx-auto flex max-w-2xl items-stretch justify-around gap-1 px-2 py-1.5">
          {mustChangePassword ? (
            <NavLink
              to="/change-password"
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold ${
                  isActive
                    ? "bg-blue text-white"
                    : "text-navy hover:bg-sky dark:text-sky dark:hover:bg-white/10"
                }`
              }
            >
              {t("nav.changePassword")}
            </NavLink>
          ) : (
            <>
              {navItems.map((item) => (
                <NavLink
                  key={`${item.layout}:${item.to}`}
                  to={item.to}
                  end={item.to === "/agent/deliveries"}
                  className={({ isActive }) =>
                    `flex flex-1 flex-col items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-blue text-white"
                        : "text-navy hover:bg-sky dark:text-sky dark:hover:bg-white/10"
                    }`
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-blue text-white"
                      : "text-navy hover:bg-sky dark:text-sky dark:hover:bg-white/10"
                  }`
                }
              >
                {t("buttons.profile")}
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}

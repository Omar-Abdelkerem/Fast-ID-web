import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiGet } from "@/lib/api";
import { getRoleHome, useAuth } from "@/lib/auth";
import { LanguageSwitcher, ThemeSwitcher, useLocalized } from "@/components";
import { BrandLogo } from "@/components/BrandLogo";
import { OptionalDevRoleSwitcher } from "./OptionalDevRoleSwitcher";

// Remember dismissed announcement for the current browser tab session
let dismissedAnnouncementKey = null;

export function PublicLayout({ children }) {
  const { t } = useTranslation("common");
  const { localize } = useLocalized();
  const { user, isAuthenticated } = useAuth();
  const [dismissedKey, setDismissedKey] = useState(dismissedAnnouncementKey);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await apiGet("/settings", { skipGlobalHandlers: true });
      return data;
    },
    staleTime: 60_000,
    retry: false,
  });

  const announcementText = settings?.announcement
    ? localize(settings.announcement)
    : "";
  const announcementKey = settings?.announcement
    ? `${settings.updatedAt || ""}:${settings.announcement.ar || ""}:${settings.announcement.en || ""}`
    : null;
  const showAnnouncement =
    Boolean(announcementText) && dismissedKey !== announcementKey;

  function handleDismissAnnouncement() {
    dismissedAnnouncementKey = announcementKey;
    setDismissedKey(announcementKey);
  }

  const dashboardPath = user ? getRoleHome(user.role) : "/";

  return (
    <div className="flex min-h-screen flex-col bg-page text-navy dark:bg-[#111533] dark:text-sky">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-blue focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t("app.skipToContent")}
      </a>

      {showAnnouncement ? (
        <div
          role="region"
          aria-label={t("app.name")}
          className="border-b border-warning/25 bg-warning-bg px-4 py-2.5 text-sm text-warning-dark"
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="font-semibold">{announcementText}</p>
            <button
              type="button"
              onClick={handleDismissAnnouncement}
              aria-label={t("app.announcementDismiss")}
              className="shrink-0 rounded-lg p-1 text-warning-dark hover:bg-warning/10"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-sm dark:border-[#2f3670] dark:bg-[#181d42]/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/" aria-label={t("app.name")}>
              <BrandLogo variant="light" />
            </Link>

            <nav aria-label={t("nav.mainNav")} className="flex items-center gap-1">
              <NavLink
                to="/services"
                className={({ isActive }) =>
                  `rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-sky text-blue-dark dark:bg-[#232963] dark:text-[#a9b8ff]"
                      : "text-navy hover:bg-page dark:text-[#e8f0fe] dark:hover:bg-[#232963]"
                  }`
                }
              >
                {t("nav.services")}
              </NavLink>
              <NavLink
                to="/verify"
                className={({ isActive }) =>
                  `rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-sky text-blue-dark dark:bg-[#232963] dark:text-[#a9b8ff]"
                      : "text-navy hover:bg-page dark:text-[#e8f0fe] dark:hover:bg-[#232963]"
                  }`
                }
              >
                {t("nav.verify")}
              </NavLink>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Link to={dashboardPath} className="btn-primary btn-sm">
                {t("app.goToDashboard")}
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary btn-sm">
                  {t("buttons.login")}
                </Link>
                <Link to="/register" className="btn-primary btn-sm">
                  {t("buttons.register")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6"
      >
        {children || <Outlet />}
      </main>

      <footer className="border-t border-line bg-white text-sm text-muted dark:border-[#2f3670] dark:bg-[#181d42] dark:text-sky/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t("app.allRightsReserved")}</p>
          <div className="flex flex-wrap items-center gap-4">
            {settings?.supportEmail ? (
              <span>
                {t("app.email")}:{" "}
                <a
                  href={`mailto:${settings.supportEmail}`}
                  className="link ltr-value"
                >
                  {settings.supportEmail}
                </a>
              </span>
            ) : null}
            {settings?.supportPhone ? (
              <span>
                {t("app.phone")}:{" "}
                <a
                  href={`tel:${settings.supportPhone}`}
                  className="link ltr-value"
                >
                  {settings.supportPhone}
                </a>
              </span>
            ) : null}
          </div>
        </div>
        <OptionalDevRoleSwitcher />
      </footer>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { LanguageSwitcher, ThemeSwitcher } from "@/components";
import { BrandLogo } from "@/components/BrandLogo";
import { getNavItems } from "./navRegistry";
import { OptionalNotificationBell } from "./OptionalNotificationBell";
import { OptionalDevRoleSwitcher } from "./OptionalDevRoleSwitcher";

function getUserInitial(fullName) {
  if (!fullName || typeof fullName !== "string") return "F";
  return fullName.trim().charAt(0).toUpperCase() || "F";
}

export function SidebarShell({ layout, homePath, children }) {
  const { t } = useTranslation("common");
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef(null);

  const mustChangePassword = Boolean(user?.mustChangePassword);
  const navItems = mustChangePassword ? [] : getNavItems(layout);

  // Close drawer and user menu on navigation
  useEffect(() => {
    setDrawerOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname, location.search]);

  // Close menus on Escape or outside click
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setUserMenuOpen(false);
      }
    }

    function handleMouseDown(event) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target)
      ) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  // Case Study dark Navy sidebar links with active Royal Blue pill (Pages 16-22)
  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
      isActive
        ? "bg-blue text-white shadow-sm"
        : "text-white/80 hover:bg-white/10 hover:text-white"
    }`;

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <Link
          to={mustChangePassword ? "/change-password" : homePath}
          aria-label={t("app.name")}
        >
          <BrandLogo variant="dark" />
        </Link>
        {drawerOpen ? (
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label={t("buttons.closeMenu")}
            className="rounded-lg p-1.5 text-white/75 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        ) : null}
      </div>

      <nav
        aria-label={t("nav.mainNav")}
        className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
      >
        {mustChangePassword ? (
          <NavLink to="/change-password" className={navLinkClass}>
            {t("nav.changePassword")}
          </NavLink>
        ) : (
          navItems.map((item) => (
            <NavLink
              key={`${item.layout}:${item.to}`}
              to={item.to}
              end={item.to === homePath}
              className={navLinkClass}
            >
              {t(item.labelKey)}
            </NavLink>
          ))
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        {!mustChangePassword ? (
          <NavLink to="/profile" className={navLinkClass}>
            {t("buttons.profile")}
          </NavLink>
        ) : null}
        <button
          type="button"
          disabled={isLoggingOut}
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-start text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {t("buttons.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-page text-navy dark:bg-[#111533] dark:text-sky">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-blue focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t("app.skipToContent")}
      </a>

      {/* Desktop dark Navy sidebar (Case Study Pages 16-22) */}
      <aside className="hidden w-64 shrink-0 bg-navy text-white lg:flex lg:flex-col">
        <div className="sticky top-0 h-screen">{renderSidebarContent()}</div>
      </aside>

      {/* Mobile slide-over Navy drawer */}
      {drawerOpen && !mustChangePassword ? (
        <div
          className="fixed inset-0 z-40 flex bg-navy/50 backdrop-blur-[1px] lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDrawerOpen(false);
            }
          }}
        >
          <div className="flex h-full w-72 max-w-[85vw] flex-col bg-navy text-white shadow-2xl">
            {renderSidebarContent()}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-sm dark:border-[#2f3670] dark:bg-[#181d42]/95">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              {!mustChangePassword ? (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label={t("buttons.openMenu")}
                  aria-expanded={drawerOpen}
                  className="rounded-xl border border-line p-2 text-navy hover:bg-sky lg:hidden"
                >
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              ) : null}

              <Link
                to={mustChangePassword ? "/change-password" : homePath}
                aria-label={t("app.name")}
                className="lg:hidden"
              >
                <BrandLogo variant="light" />
              </Link>
            </div>

            <div className="flex items-center gap-2.5">
              <OptionalNotificationBell />
              <ThemeSwitcher />
              <LanguageSwitcher />

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label={t("nav.userMenu")}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-page py-1 pe-3 ps-1.5 text-xs font-semibold text-navy transition-colors hover:bg-sky"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue text-xs font-bold text-white"
                  >
                    {getUserInitial(user?.fullName)}
                  </span>
                  <span className="max-w-[9rem] truncate">
                    {user?.fullName || t("nav.profile")}
                  </span>
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {userMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute end-0 mt-2 w-56 rounded-2xl border border-line bg-white p-1.5 shadow-xl"
                  >
                    {user ? (
                      <div className="border-b border-line px-3 py-2 text-start">
                        <p className="truncate text-sm font-bold text-navy">
                          {user.fullName}
                        </p>
                        <p className="text-xs text-muted">
                          {t(`roles.${user.role}`, { defaultValue: user.role })}
                        </p>
                      </div>
                    ) : null}

                    {!mustChangePassword ? (
                      <Link
                        to="/profile"
                        role="menuitem"
                        className="mt-1 block rounded-xl px-3 py-2 text-start text-sm font-medium text-navy hover:bg-sky"
                      >
                        {t("buttons.profile")}
                      </Link>
                    ) : null}

                    <Link
                      to="/change-password"
                      role="menuitem"
                      className="block rounded-xl px-3 py-2 text-start text-sm font-medium text-navy hover:bg-sky"
                    >
                      {t("buttons.changePassword")}
                    </Link>

                    <button
                      type="button"
                      role="menuitem"
                      disabled={isLoggingOut}
                      onClick={handleLogout}
                      className="mt-1 block w-full rounded-xl px-3 py-2 text-start text-sm font-semibold text-danger hover:bg-danger-bg disabled:opacity-50"
                    >
                      {t("buttons.logout")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {mustChangePassword ? (
          <div
            role="alert"
            className="border-b border-warning/25 bg-warning-bg px-4 py-2.5 text-sm font-semibold text-warning-dark sm:px-6"
          >
            {t("nav.passwordChangeRequiredBanner")}
          </div>
        ) : null}

        <main id="main-content" className="min-w-0 flex-1 p-4 sm:p-6">
          {children || <Outlet />}
        </main>

        <footer className="border-t border-line bg-white">
          <OptionalDevRoleSwitcher />
        </footer>
      </div>
    </div>
  );
}

import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getRoleHome, useAuth } from "@/lib/auth";
import { setMockRole } from "./store";

const ROLES = ["CITIZEN", "ADMIN", "AGENT"];

export function DevRoleSwitcher() {
  const { t } = useTranslation("common");
  const { user, refreshUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isMockMode =
    (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === "true") ||
    import.meta.env.MODE === "demo";

  if (!isMockMode) {
    return null;
  }

  async function handleSelectRole(role) {
    setMockRole(role);
    queryClient.clear();
    try {
      await refreshUser();
      navigate(getRoleHome(role), { replace: true });
    } catch {
      navigate("/login", { replace: true });
    }
  }

  async function handleGuest() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="border-t border-line bg-sky/60 px-4 py-2.5 text-xs text-navy">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-navy">
            {t("app.devMode")} · {t("app.mockRole")}:
          </span>
          {ROLES.map((role) => {
            const isCurrent = user?.role === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => handleSelectRole(role)}
                className={
                  isCurrent ? "btn-primary btn-sm" : "btn-secondary btn-sm"
                }
              >
                {t(`roles.${role}`)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleGuest}
            className="btn-secondary btn-sm"
          >
            {t("buttons.logout")}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/dev/login" className="link">
            /dev/login
          </Link>
          <Link to="/dev/ui" className="link">
            /dev/ui
          </Link>
        </div>
      </div>
    </div>
  );
}

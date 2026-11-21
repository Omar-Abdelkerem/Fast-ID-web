import { useTranslation } from "react-i18next";
import { USE_MOCKS } from "@/lib/env";
import { getRoleHome } from "@/lib/auth";

export const getMockRole = () => localStorage.getItem("mockRole") || "ADMIN";

// Mock mode only: pick which role the mock session belongs to, then open that role's home
export default function MockRoleSwitcher({ className = "" }) {
  const { t } = useTranslation();
  if (!USE_MOCKS) return null;

  const change = (event) => {
    localStorage.setItem("mockRole", event.target.value);
    window.location.assign(getRoleHome(event.target.value));
  };

  return (
    <label className={`block text-xs ${className}`}>
      <span className="mb-1 block opacity-70">{t("mock.role")}</span>
      <select
        value={getMockRole()}
        onChange={change}
        className="w-full rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs text-white [&>option]:text-espresso"
      >
        {["ADMIN", "AGENT", "CITIZEN"].map((role) => (
          <option key={role} value={role}>
            {t(`roles.${role}`)}
          </option>
        ))}
      </select>
    </label>
  );
}

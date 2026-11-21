import { useTranslation } from "react-i18next";
import { allNavEntries, roleOfLayoutName } from "@/lib/registry";
import { BASE_PATH } from "@/lib/env";

// Mock mode only: lists the screens that exist in this build, so nobody has to guess the address.
// A button switches the mock role to the one the screen belongs to and opens it.
export default function AvailableScreens() {
  const { t } = useTranslation();
  const entries = allNavEntries();
  if (entries.length === 0) return null;

  const open = (entry) => {
    localStorage.setItem("mockRole", roleOfLayoutName(entry.layout));
    window.location.assign(`${BASE_PATH}${entry.to}`);
  };

  return (
    <div className="mt-6 text-start">
      <p className="mb-2 text-sm font-semibold">{t("demo.available")}</p>
      <ul className="flex flex-wrap gap-2">
        {entries.map((entry) => (
          <li key={entry.to}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => open(entry)}>
              {t(entry.labelKey)} <span className="text-muted">({t(`roles.${roleOfLayoutName(entry.layout)}`)})</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">{t("demo.pending")}</p>
    </div>
  );
}

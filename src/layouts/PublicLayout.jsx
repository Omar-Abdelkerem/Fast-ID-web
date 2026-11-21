import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { navFor } from "@/lib/registry";
import { LanguageSwitcher, ThemeSwitcher } from "@/components/Switchers";

// Public pages (no login): simple header and centred content
export default function PublicLayout({ children }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <header className="bg-espresso text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 p-3">
          <Link to="/" className="font-heading text-lg font-bold">
            Fast ID
          </Link>
          <nav className="flex flex-wrap gap-1" aria-label="main">
            {navFor("public").map((entry) => (
              <NavLink key={entry.to} to={entry.to} className={({ isActive }) => `rounded-xl px-3 py-1.5 text-sm ${isActive ? "bg-terracotta-dark" : "hover:bg-white/10"}`}>
                {t(entry.labelKey)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 md:p-6">{children}</main>
    </div>
  );
}

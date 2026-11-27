import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ThemeSwitcher({ className = "" }) {
  const { i18n } = useTranslation("common");
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  const isArabic = !i18n.language?.startsWith("en");

  function toggleTheme() {
    const nextDark = !isDark;
    document.documentElement.classList.toggle("dark", nextDark);
    try {
      localStorage.setItem("theme", nextDark ? "dark" : "light"); // restored by the script in index.html
    } catch {
      // private mode: the choice just lasts until the page is reloaded
    }
    setIsDark(nextDark);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={
        isArabic
          ? isDark
            ? "التبديل إلى الوضع الفاتح"
            : "التبديل إلى الوضع الداكن"
          : isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
      }
      className={`btn-secondary btn-sm px-2.5 ${className}`.trim()}
    >
      {isDark ? (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
          />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
          />
        </svg>
      )}
    </button>
  );
}

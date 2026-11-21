import { useState } from "react";
import { useTranslation } from "react-i18next";

// A real on/off switch: a track with a sliding knob. The knob shows the active side.
// The track is always left-to-right so the knob moves the same way in Arabic and English.
function Switch({ checked, onChange, label, off, on }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      dir="ltr"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-8 w-[4.25rem] shrink-0 items-center rounded-full bg-white/10 ring-1 ring-white/20 transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-xs font-bold text-white/50">{off}</span>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex w-8 items-center justify-center text-xs font-bold text-white/50">{on}</span>
      <span
        className={`pointer-events-none absolute left-1 top-1 flex h-6 w-8 items-center justify-center rounded-full bg-terracotta-dark text-xs font-bold text-white shadow-md transition-transform duration-200 ease-out ${
          checked ? "translate-x-[2.25rem]" : "translate-x-0"
        }`}
      >
        {checked ? on : off}
      </span>
    </button>
  );
}

const icon = (name) => (
  <span className="material-icons leading-none" style={{ fontSize: "1.1rem" }} aria-hidden="true">
    {name}
  </span>
);

// Language switch: left = Arabic, right = English
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === "en";
  const change = (english) => {
    const lang = english ? "en" : "ar";
    localStorage.setItem("lang", lang);
    i18n.changeLanguage(lang);
  };
  return <Switch checked={isEnglish} onChange={change} label={isEnglish ? "Language: English" : "اللغة: العربية"} off="ع" on="EN" />;
}

// The theme is the "dark" class on <html>. Saved in localStorage, defaults to the OS setting.
export function getTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

// Theme switch: left = light (sun), right = dark (moon)
export function ThemeSwitcher() {
  const { i18n } = useTranslation();
  const [theme, setTheme] = useState(getTheme);
  const isAr = i18n.language !== "en";
  const change = (dark) => {
    const next = dark ? "dark" : "light";
    localStorage.setItem("theme", next);
    applyTheme(next);
    setTheme(next);
  };
  return <Switch checked={theme === "dark"} onChange={change} label={isAr ? "المظهر الداكن" : "Dark mode"} off={icon("light_mode")} on={icon("dark_mode")} />;
}

// The block at the bottom of the sidebar: a label and a switch per row
export function SidebarSettings() {
  const { i18n } = useTranslation();
  const isAr = i18n.language !== "en";
  const rows = [
    { key: "lang", icon: "translate", text: isAr ? "اللغة" : "Language", control: <LanguageSwitcher /> },
    { key: "theme", icon: "contrast", text: isAr ? "المظهر" : "Theme", control: <ThemeSwitcher /> },
  ];
  return (
    <div className="space-y-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-white/80">
            {icon(row.icon)}
            {row.text}
          </span>
          {row.control}
        </div>
      ))}
    </div>
  );
}

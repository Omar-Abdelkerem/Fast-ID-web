import { useTranslation } from "react-i18next";

export function LanguageSwitcher({ className = "" }) {
  const { t, i18n } = useTranslation("common");
  const isArabic = !i18n.language?.startsWith("en");
  const nextLang = isArabic ? "en" : "ar";

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(nextLang)}
      aria-label={isArabic ? t("languages.switchToEn") : t("languages.switchToAr")}
      className={`btn-secondary btn-sm ${className}`.trim()}
    >
      {isArabic ? t("languages.en") : t("languages.ar")}
    </button>
  );
}

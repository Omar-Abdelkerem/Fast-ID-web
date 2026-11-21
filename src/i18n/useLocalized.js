import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function useLocalized() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "ar";

  const localize = useCallback(
    (value) => {
      if (value === null || value === undefined) return "";
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        return value[lang] || value.ar || value.en || "";
      }
      return String(value);
    },
    [lang]
  );

  return { localize };
}

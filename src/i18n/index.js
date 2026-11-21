import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import arCommon from "./locales/ar/common.json";
import enCommon from "./locales/en/common.json";

const LANGUAGE_STORAGE_KEY = "fastid_lang";
const SUPPORTED_LANGUAGES = ["ar", "en"];

function normalizeLanguage(lang) {
  if (typeof lang !== "string") return "ar";
  const base = lang.toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : "ar";
}

function getSavedLanguage() {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved) {
      return normalizeLanguage(saved);
    }
  } catch {
    // Ignore storage access errors
  }
  return "ar";
}

function applyDocumentDirection(lang) {
  if (typeof document === "undefined") return;
  const normalized = normalizeLanguage(lang);
  document.documentElement.lang = normalized;
  document.documentElement.dir = normalized === "ar" ? "rtl" : "ltr";
}

function saveLanguage(lang) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(lang));
  } catch {
    // Ignore storage access errors
  }
}

const resources = {
  ar: { common: arCommon },
  en: { common: enCommon },
};

const namespaceSet = new Set(["common"]);

// Auto-discover feature locale files: src/features/<feature>/locales/{ar,en}.json
const featureLocaleModules = import.meta.glob(
  "/src/features/*/locales/{ar,en}.json",
  { eager: true }
);

for (const [filePath, moduleExports] of Object.entries(featureLocaleModules)) {
  const match = filePath.match(/\/src\/features\/([^/]+)\/locales\/(ar|en)\.json$/);
  if (!match) continue;
  const [, featureName, lang] = match;
  resources[lang][featureName] = moduleExports.default || moduleExports;
  namespaceSet.add(featureName);
}

const allNamespaces = Array.from(namespaceSet);
const initialLanguage = getSavedLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  ns: allNamespaces,
  defaultNS: "common",
  fallbackNS: allNamespaces,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

applyDocumentDirection(initialLanguage);

i18n.on("languageChanged", (nextLang) => {
  const normalized = normalizeLanguage(nextLang);
  applyDocumentDirection(normalized);
  saveLanguage(normalized);
});

export default i18n;

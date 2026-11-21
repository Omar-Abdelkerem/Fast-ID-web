import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import commonAr from "./locales/ar.json";
import commonEn from "./locales/en.json";

// Every feature has src/features/<feature>/locales/ar.json and en.json.
// They are loaded automatically as a namespace named after the feature folder.
const featureFiles = import.meta.glob("../features/*/locales/*.json", { eager: true });
const resources = { ar: { common: commonAr }, en: { common: commonEn } };

for (const [path, module] of Object.entries(featureFiles)) {
  const [, feature, lang] = path.match(/features\/([^/]+)\/locales\/(\w+)\.json$/);
  resources[lang][feature] = module.default;
}

const savedLanguage = localStorage.getItem("lang");

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage === "en" ? "en" : "ar", // Arabic is the default
  fallbackLng: "en",
  defaultNS: "common",
  interpolation: { escapeValue: false },
  // so t("errors.SOME_CODE") finds the message in any feature's namespace
  fallbackNS: Object.keys(resources.ar),
});

// the document direction and language follow the active language
function applyDirection(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}
applyDirection(i18n.language);
i18n.on("languageChanged", applyDirection);

export default i18n;

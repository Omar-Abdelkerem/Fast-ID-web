import { useTranslation } from "react-i18next";

const SIZE_CLASSES = {
  sm: "h-4 w-4 border-2",
  md: "h-7 w-7 border-[3px]",
  lg: "h-11 w-11 border-4",
};

export function Spinner({ size = "md", className = "" }) {
  const { t } = useTranslation("common");
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center justify-center ${className}`.trim()}
    >
      <span
        aria-hidden="true"
        className={`inline-block animate-spin rounded-full border-sky border-t-blue ${sizeClass}`}
      />
      <span className="sr-only">{t("states.loading")}</span>
    </span>
  );
}

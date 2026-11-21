import { useTranslation } from "react-i18next";

const styles = {
  DRAFT: "bg-beige text-espresso border border-line",
  PUBLISHED: "bg-green-100 text-success",
  UNPUBLISHED: "bg-amber-100 text-warning",
};

// the label is always shown, so status is never colour only
export default function AvailabilityBadge({ value }) {
  const { t } = useTranslation("admin-services");
  return <span className={`badge ${styles[value]}`}>{t(`availability.${value}`)}</span>;
}

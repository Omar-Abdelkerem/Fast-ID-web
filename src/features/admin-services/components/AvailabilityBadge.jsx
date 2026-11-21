import { useTranslation } from "react-i18next";

const styles = {
  DRAFT: "bg-beige dark:bg-[#232963] text-espresso dark:text-[#E8F0FE] border border-line dark:border-[#2f3670]",
  PUBLISHED: "bg-green-100 dark:bg-[#17382c] text-success dark:text-[#7fd1a8]",
  UNPUBLISHED: "bg-amber-100 dark:bg-[#3d3010] text-warning dark:text-[#f0c36a]",
};

// the label is always shown, so status is never colour only
export default function AvailabilityBadge({ value }) {
  const { t } = useTranslation("admin-services");
  return <span className={`badge ${styles[value]}`}>{t(`availability.${value}`)}</span>;
}

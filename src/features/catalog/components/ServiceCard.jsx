import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocalized } from "@/components";
import { formatMoney } from "@/lib/format";

// fee text: amount 0 means free
export function useFeeText() {
  const { t, i18n } = useTranslation("catalog");
  return (fee) => (fee.amount === 0 ? t("service.free") : formatMoney(fee, i18n.language));
}

export default function ServiceCard({ service }) {
  const { t } = useTranslation("catalog");
  const { localize } = useLocalized();
  const feeText = useFeeText();
  return (
    <Link to={`/services/${service.id}`} className="card flex h-full flex-col gap-2 transition-shadow hover:shadow-md">
      <span className="badge self-start bg-beige text-espresso dark:bg-[#232963] dark:text-[#E8F0FE]">{t(`category.${service.category}`)}</span>
      <h3 className="text-lg font-bold">{localize(service.name)}</h3>
      <p className="line-clamp-3 flex-1 text-sm text-muted">{localize(service.description)}</p>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">{feeText(service.fee)}</span>
        <span className="text-muted">{t("service.decisionWithin", { count: service.slaDays })}</span>
      </div>
    </Link>
  );
}

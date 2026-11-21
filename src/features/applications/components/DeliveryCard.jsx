import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components";

// delivery is the contract's DeliveryTracking. The code is shown ONLY while the item is out for delivery.
export default function DeliveryCard({ delivery }) {
  const { t } = useTranslation("applications");
  const outForDelivery = delivery.status === "OUT_FOR_DELIVERY";

  return (
    <section className="card space-y-3" aria-labelledby="delivery-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="delivery-title" className="text-lg font-bold">{t("delivery.title")}</h2>
        <StatusBadge kind="delivery" value={delivery.status} />
      </div>

      {delivery.attempts > 0 && <p className="text-sm">{t("delivery.attempts", { count: delivery.attempts })}</p>}

      {delivery.lastFailure && (
        <div className="rounded-xl bg-red-50 p-3 text-sm dark:bg-[#4a1f24]">
          <p className="flex items-center gap-1 font-semibold text-danger dark:text-[#ff8a80]">
            <span className="material-icons" aria-hidden="true">report_problem</span>
            {t("delivery.lastFailure")}
          </p>
          <p>
            {t(`reasons.${delivery.lastFailure.reasonCode}`, { defaultValue: delivery.lastFailure.reasonCode })}
            {delivery.lastFailure.reason ? `: ${delivery.lastFailure.reason}` : ""}
          </p>
        </div>
      )}

      {outForDelivery && delivery.deliveryCode && (
        <div className="rounded-2xl bg-beige p-4 text-center dark:bg-[#232963]">
          <p className="text-sm text-muted">{t("delivery.codeLabel")}</p>
          <p dir="ltr" className="my-2 font-mono text-5xl font-bold tracking-[0.3em]" aria-label={delivery.deliveryCode.split("").join(" ")}>
            {delivery.deliveryCode}
          </p>
          <p className="text-sm font-semibold">{t("delivery.codeWarning")}</p>
        </div>
      )}

      {outForDelivery && delivery.agent && (
        <p className="text-sm">
          {t("delivery.agent")}: <span className="font-semibold">{delivery.agent.fullName}</span>
          {" · "}
          <a href={`tel:${delivery.agent.phone}`} className="link" dir="ltr">{delivery.agent.phone}</a>
        </p>
      )}
    </section>
  );
}

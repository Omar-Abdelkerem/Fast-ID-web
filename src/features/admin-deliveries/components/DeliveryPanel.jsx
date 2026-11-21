import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Spinner, StatusBadge, useLocalized } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { getAdminDelivery } from "../api";
import useGovernorates from "./useGovernorates";
import Icon from "./Icon";

const assignableStatuses = ["PENDING_ASSIGNMENT", "ASSIGNED", "FAILED_ATTEMPT"];

// Side panel with the full delivery
export default function DeliveryPanel({ deliveryId, onClose, onAssign }) {
  const { t, i18n } = useTranslation("admin-deliveries");
  const { localize } = useLocalized();
  const { nameOf } = useGovernorates();
  const query = useQuery({ queryKey: ["admin", "deliveries", deliveryId], queryFn: () => getAdminDelivery(deliveryId) });
  const delivery = query.data;

  return (
    <aside role="dialog" aria-label={t("panel.title")} className="fixed inset-y-0 end-0 z-30 w-full max-w-sm overflow-y-auto border-s border-line dark:border-[#2f3670] bg-white dark:bg-[#1b2048] p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-lg">{t("panel.title")}</h2>
        <button className="btn btn-secondary dark:bg-transparent dark:text-[#E8F0FE] dark:border-[#8da0ff] dark:hover:bg-[#232963] btn-sm" onClick={onClose}>{t("panel.close")}</button>
      </div>

      {query.isLoading && <Spinner />}
      {query.isError && (
        <p role="alert" className="text-danger dark:text-[#ff8a80] text-sm">
          {getErrorMessage(query.error, t)}
        </p>
      )}

      {delivery && (
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold">{delivery.applicationNumber}</span>
            <StatusBadge value={delivery.status} />
          </div>
          <dl className="grid grid-cols-2 gap-2">
            <dt className="text-muted dark:text-[#A9B0D6]">{t("columns.service")}</dt><dd>{localize(delivery.service.name)}</dd>
            <dt className="text-muted dark:text-[#A9B0D6]">{t("columns.recipient")}</dt><dd>{delivery.recipientName}</dd>
            <dt className="text-muted dark:text-[#A9B0D6]">{t("panel.phone")}</dt><dd dir="ltr" className="text-start">{delivery.address.phone}</dd>
            <dt className="text-muted dark:text-[#A9B0D6]">{t("columns.location")}</dt><dd>{nameOf(delivery.address.governorate)} · {delivery.address.city}</dd>
            <dt className="text-muted dark:text-[#A9B0D6]">{t("panel.address")}</dt><dd>{delivery.address.addressLine}</dd>
            <dt className="text-muted dark:text-[#A9B0D6]">{t("panel.notes")}</dt><dd>{delivery.address.notes || "—"}</dd>
            <dt className="text-muted dark:text-[#A9B0D6]">{t("columns.agent")}</dt><dd>{delivery.agent ? delivery.agent.fullName : t("unassigned")}</dd>
            <dt className="text-muted dark:text-[#A9B0D6]">{t("columns.assignedAt")}</dt><dd>{delivery.assignedAt ? formatDateTime(delivery.assignedAt, i18n.language) : "—"}</dd>
            <dt className="text-muted dark:text-[#A9B0D6]">{t("columns.attempts")}</dt><dd>{delivery.attempts}</dd>
          </dl>
          {delivery.lastFailure && (
            <div className="rounded-lg bg-red-50 dark:bg-[#4a1f24] p-2">
              <p className="font-semibold text-danger dark:text-[#ff8a80]"><Icon name="warning" /> {t("panel.lastFailure")}</p>
              <p>{t(`reasons.${delivery.lastFailure.reasonCode}`)}{delivery.lastFailure.reason ? `: ${delivery.lastFailure.reason}` : ""}</p>
            </div>
          )}
          {/* assigning is not possible once the delivery is out or delivered */}
          {assignableStatuses.includes(delivery.status) && (
            <button className="btn btn-primary w-full" onClick={() => onAssign(delivery)}>
              {delivery.agent ? t("assign.reassign") : t("assign.assign")}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

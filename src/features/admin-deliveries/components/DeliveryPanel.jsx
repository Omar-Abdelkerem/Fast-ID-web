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
    <aside role="dialog" aria-label={t("panel.title")} className="fixed inset-y-0 end-0 z-30 w-full max-w-sm overflow-y-auto border-s border-line bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-lg">{t("panel.title")}</h2>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>{t("panel.close")}</button>
      </div>

      {query.isLoading && <Spinner />}
      {query.isError && (
        <p role="alert" className="text-danger text-sm">
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
            <dt className="text-muted">{t("columns.service")}</dt><dd>{localize(delivery.service.name)}</dd>
            <dt className="text-muted">{t("columns.recipient")}</dt><dd>{delivery.recipient.fullName}</dd>
            <dt className="text-muted">{t("panel.phone")}</dt><dd dir="ltr" className="text-start">{delivery.recipient.phone}</dd>
            <dt className="text-muted">{t("columns.location")}</dt><dd>{nameOf(delivery.recipient.governorate)} · {delivery.recipient.city}</dd>
            <dt className="text-muted">{t("panel.address")}</dt><dd>{delivery.recipient.addressLine}</dd>
            <dt className="text-muted">{t("panel.notes")}</dt><dd>{delivery.recipient.notes || "—"}</dd>
            <dt className="text-muted">{t("columns.agent")}</dt><dd>{delivery.agent ? delivery.agent.fullName : t("unassigned")}</dd>
            <dt className="text-muted">{t("columns.assignedAt")}</dt><dd>{delivery.assignedAt ? formatDateTime(delivery.assignedAt, i18n.language) : "—"}</dd>
            <dt className="text-muted">{t("columns.attempts")}</dt><dd>{delivery.attempts}</dd>
          </dl>
          {delivery.lastFailure && (
            <div className="rounded-lg bg-red-50 p-2">
              <p className="font-semibold text-danger"><Icon name="warning" /> {t("panel.lastFailure")}</p>
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

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner, StatusBadge, ErrorState, useLocalized, useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { getAgentDelivery, startDelivery } from "../api";
import useGovernorateName from "../components/useGovernorateName";
import CodeEntry from "../components/CodeEntry";
import FailForm from "../components/FailForm";
import Icon from "../components/Icon";

export default function DeliveryDetailPage() {
  const { deliveryId } = useParams();
  const { t, i18n } = useTranslation("agent");
  const { localize } = useLocalized();
  const governorateName = useGovernorateName();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [locked, setLocked] = useState(false); // the code got locked after too many wrong tries
  const [justDelivered, setJustDelivered] = useState(false);

  const query = useQuery({
    queryKey: ["agent", "deliveries", deliveryId],
    queryFn: () => getAgentDelivery(deliveryId),
    refetchOnWindowFocus: true,
  });
  const delivery = query.data;

  const startMutation = useMutation({
    mutationFn: () => startDelivery(deliveryId),
    onSuccess: () => {
      toast.success(t("start.success"));
      queryClient.invalidateQueries({ queryKey: ["agent", "deliveries"] });
    },
    onError: (error) => {
      toast.error(error.code === "INVALID_STATUS_TRANSITION" ? t("errors.INVALID_STATUS_TRANSITION") : getErrorMessage(error, t));
      // the status already changed somewhere else: reload it
      queryClient.invalidateQueries({ queryKey: ["agent", "deliveries"] });
    },
  });

  const backLink = <Link to="/agent/deliveries" className="btn btn-secondary dark:bg-transparent dark:text-[#E8F0FE] dark:border-[#8da0ff] dark:hover:bg-[#232963] min-h-[48px] w-full">{t("detail.back")}</Link>;

  if (query.isLoading) return <Spinner />;
  if (query.isError) {
    // friendly page when the delivery is not found (or belongs to someone else)
    if (query.error.code === "DELIVERY_NOT_FOUND") {
      return (
        <div className="card dark:bg-[#1b2048] dark:border-[#2f3670] space-y-3 py-8 text-center">
          <p className="font-bold">{t("errors.DELIVERY_NOT_FOUND")}</p>
          {backLink}
        </div>
      );
    }
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  }

  if (justDelivered) {
    return (
      <div className="card dark:bg-[#1b2048] dark:border-[#2f3670] space-y-4 py-8 text-center" role="status">
        <p className="text-success dark:text-[#7fd1a8]" style={{ fontSize: "3rem" }}><Icon name="check_circle" className="!text-[3rem]" /></p>
        <h1 className="text-xl font-bold text-success dark:text-[#7fd1a8]">{t("delivered.title")}</h1>
        <p className="text-sm text-muted dark:text-[#A9B0D6]">{delivery.applicationNumber}</p>
        {backLink}
      </div>
    );
  }

  const { address } = delivery;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="page-title dark:text-white">{delivery.recipientName}</h1>
          <p dir="ltr" className="text-start text-xs text-muted dark:text-[#A9B0D6]">{delivery.applicationNumber}</p>
        </div>
        <StatusBadge value={delivery.status} />
      </div>

      <section className="card dark:bg-[#1b2048] dark:border-[#2f3670] space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2">
          <dt className="text-muted dark:text-[#A9B0D6]">{t("detail.service")}</dt><dd>{localize(delivery.service.name)}</dd>
          <dt className="text-muted dark:text-[#A9B0D6]">{t("detail.address")}</dt>
          <dd>{governorateName(address.governorate)} · {address.city}<br />{address.addressLine}</dd>
          <dt className="text-muted dark:text-[#A9B0D6]">{t("detail.notes")}</dt><dd>{address.notes || "—"}</dd>
          <dt className="text-muted dark:text-[#A9B0D6]">{t("detail.attempts")}</dt><dd>{delivery.attempts}</dd>
        </dl>
        {delivery.lastFailure && (
          <div className="rounded-lg bg-red-50 dark:bg-[#4a1f24] p-2">
            <p className="font-semibold text-danger dark:text-[#ff8a80]"><Icon name="warning" /> {t("detail.lastFailure")}</p>
            <p>{t(`reasons.${delivery.lastFailure.reasonCode}`)}{delivery.lastFailure.reason ? `: ${delivery.lastFailure.reason}` : ""}</p>
            <p className="text-xs text-muted dark:text-[#A9B0D6]">{formatDateTime(delivery.lastFailure.at, i18n.language)}</p>
          </div>
        )}
        <a href={`tel:${address.phone}`} className="btn btn-secondary dark:bg-transparent dark:text-[#E8F0FE] dark:border-[#8da0ff] dark:hover:bg-[#232963] min-h-[48px] w-full"><Icon name="call" /> {t("detail.call")} <span dir="ltr">{address.phone}</span></a>
      </section>

      {delivery.status === "ASSIGNED" && (
        <button className="btn btn-primary min-h-[56px] w-full text-base" disabled={startMutation.isPending} onClick={() => startMutation.mutate()}>
          {startMutation.isPending ? t("start.starting") : t("start.button")}
        </button>
      )}

      {delivery.status === "OUT_FOR_DELIVERY" && (
        <>
          <CodeEntry deliveryId={deliveryId} locked={locked} onLocked={() => setLocked(true)} onDelivered={() => setJustDelivered(true)} />
          <FailForm deliveryId={deliveryId} emphasised={locked} onDone={() => setLocked(false)} />
        </>
      )}

      {delivery.status === "FAILED_ATTEMPT" && <p className="card dark:bg-[#1b2048] dark:border-[#2f3670] text-center text-sm font-semibold">{t("detail.waitingReassign")}</p>}
      {delivery.status === "DELIVERED" && <p className="card dark:bg-[#1b2048] dark:border-[#2f3670] text-center text-sm font-semibold text-success dark:text-[#7fd1a8]"><Icon name="check_circle" /> {t("delivered.summary")}</p>}

      {backLink}
    </div>
  );
}

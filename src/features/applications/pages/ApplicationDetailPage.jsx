import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState, ErrorState, Modal, Spinner, StatusBadge, useLocalized, useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { cancelApplication, getApplication, getService, openAttachment } from "../api";
import StatusTimeline from "../components/StatusTimeline";
import DeliveryCard from "../components/DeliveryCard";
import AnswersTable from "../components/AnswersTable";

// the application is still moving: refetch every 30 seconds
const LIVE_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "OUT_FOR_DELIVERY"];

export default function ApplicationDetailPage() {
  const { applicationId } = useParams();
  const { t, i18n } = useTranslation("applications");
  const { localize } = useLocalized();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  // the key ["applications", id] is invalidated by the notifications feature (it invalidates the ["applications"] prefix)
  const applicationQuery = useQuery({
    queryKey: ["applications", applicationId],
    queryFn: () => getApplication(applicationId),
    refetchInterval: (query) => (LIVE_STATUSES.includes(query.state.data?.status) ? 30 * 1000 : false),
    refetchOnWindowFocus: true,
  });
  const application = applicationQuery.data;

  // labels for the answers; if this fails the raw keys are shown
  const serviceQuery = useQuery({
    queryKey: ["services", application?.service.id],
    queryFn: () => getService(application.service.id),
    enabled: Boolean(application) && application.status !== "DRAFT",
    retry: false,
    staleTime: 60 * 1000,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelApplication(applicationId, reason.trim()),
    onSuccess: () => {
      toast.success(t("cancel.success"));
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error) => {
      if (error.code === "INVALID_STATUS_TRANSITION") {
        // someone moved it already: refetch and explain
        toast.error(t("cancel.tooLate"));
        setCancelOpen(false);
        queryClient.invalidateQueries({ queryKey: ["applications"] });
      } else {
        toast.error(getErrorMessage(error, t));
      }
    },
  });

  const attachmentMutation = useMutation({
    mutationFn: (attachment) => openAttachment(applicationId, attachment.id),
    onError: (error) => toast.error(getErrorMessage(error, t)),
  });

  if (applicationQuery.isLoading) return <Spinner />;
  if (applicationQuery.isError) {
    if (applicationQuery.error.code === "APPLICATION_NOT_FOUND") {
      return (
        <EmptyState
          title={t("detail.notFoundTitle")}
          text={t("detail.notFoundText")}
          action={<Link to="/applications" className="btn btn-primary">{t("detail.back")}</Link>}
        />
      );
    }
    return <ErrorState error={applicationQuery.error} onRetry={applicationQuery.refetch} />;
  }

  function submitCancel() {
    if (reason.trim().length > 300) return setReasonError(t("cancel.tooLong"));
    setReasonError("");
    cancelMutation.mutate();
  }

  const { decision, credential, delivery, payment, deliveryAddress } = application;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/applications" className="link text-sm">{t("detail.back")}</Link>

      <header className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="page-title">{localize(application.service.name)}</h1>
            <p dir="ltr" className="text-start text-sm text-muted">{application.applicationNumber}</p>
          </div>
          <StatusBadge kind="application" value={application.status} />
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm">
          {application.submittedAt && <div><dt className="text-muted">{t("fields.submittedAt")}</dt><dd className="font-semibold">{formatDateTime(application.submittedAt, i18n.language)}</dd></div>}
          {application.dueAt && <div><dt className="text-muted">{t("fields.dueAt")}</dt><dd className="font-semibold">{formatDate(application.dueAt, i18n.language)}</dd></div>}
        </dl>
        {application.isOverdue && (
          <p role="note" className="mt-3 flex items-center gap-1 rounded-xl bg-amber-100 p-2 text-sm text-warning dark:bg-[#3d3010] dark:text-[#f0c36a]">
            <span className="material-icons" aria-hidden="true">schedule</span>
            {t("detail.overdueNote")}
          </p>
        )}
        {application.status === "DRAFT" && (
          <Link to={`/apply/${application.service.id}`} className="btn btn-primary mt-4">{t("detail.continue")}</Link>
        )}
        {application.status === "SUBMITTED" && (
          <button type="button" className="btn btn-danger mt-4" onClick={() => setCancelOpen(true)}>{t("cancel.button")}</button>
        )}
      </header>

      {application.status !== "DRAFT" && (
        <section className="card" aria-labelledby="timeline-title">
          <h2 id="timeline-title" className="mb-3 text-lg font-bold">{t("timeline.title")}</h2>
          <StatusTimeline application={application} />
        </section>
      )}

      {decision?.outcome === "REJECTED" && (
        <section role="alert" className="card border-danger bg-red-50 dark:bg-[#4a1f24]">
          <h2 className="mb-1 flex items-center gap-1 text-lg font-bold text-danger dark:text-[#ff8a80]">
            <span className="material-icons" aria-hidden="true">error</span>
            {t("decision.rejectedTitle")}
          </h2>
          {decision.reasonCode && <p className="text-sm font-semibold">{t(`reasons.${decision.reasonCode}`, { defaultValue: decision.reasonCode })}</p>}
          {decision.reason && <p className="mt-1">{decision.reason}</p>}
          <Link to={`/apply/${application.service.id}`} className="btn btn-primary mt-3">{t("decision.applyAgain")}</Link>
        </section>
      )}

      {decision?.outcome === "APPROVED" && credential && (
        <section className="card">
          <h2 className="mb-2 text-lg font-bold">{t("decision.approvedTitle")}</h2>
          <p className="text-sm">
            {t("decision.credential")}: <span dir="ltr" className="font-mono font-semibold">{credential.number}</span>{" "}
            <StatusBadge kind="credential" value={credential.status} />
          </p>
          <Link to="/credentials" className="link mt-2 inline-block text-sm">{t("decision.viewCredentials")}</Link>
        </section>
      )}

      {delivery && <DeliveryCard delivery={delivery} />}

      {application.status !== "DRAFT" && (
        <>
          <section className="card">
            <h2 className="mb-2 text-lg font-bold">{t("answers.title")}</h2>
            <AnswersTable data={application.data} service={serviceQuery.data} />
          </section>

          <section className="card grid gap-4 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 text-lg font-bold">{t("address.title")}</h2>
              {deliveryAddress ? (
                <p className="text-sm">
                  {deliveryAddress.governorate} · {deliveryAddress.city}<br />
                  {deliveryAddress.addressLine}<br />
                  <span dir="ltr">{deliveryAddress.phone}</span>
                  {deliveryAddress.notes && <><br />{deliveryAddress.notes}</>}
                </p>
              ) : (
                <p className="text-sm text-muted">—</p>
              )}
            </div>
            <div>
              <h2 className="mb-2 text-lg font-bold">{t("payment.title")}</h2>
              <p className="text-sm">
                {formatMoney(payment.amount, i18n.language)} <StatusBadge kind="payment" value={payment.status} />
              </p>
              {payment.reference && <p className="text-xs text-muted">{t("payment.reference")}: <span dir="ltr">{payment.reference}</span></p>}
              {payment.paidAt && <p className="text-xs text-muted">{t("payment.paidAt")}: {formatDateTime(payment.paidAt, i18n.language)}</p>}
            </div>
          </section>

          <section className="card">
            <h2 className="mb-2 text-lg font-bold">{t("attachments.title")}</h2>
            {application.attachments.length === 0 ? (
              <p className="text-sm text-muted">{t("attachments.none")}</p>
            ) : (
              <ul className="divide-y divide-line dark:divide-[#2f3670]">
                {application.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      <span className="font-semibold" dir="auto">{attachment.originalName}</span>
                      <span className="text-muted"> · {attachment.mimeType} · {Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB</span>
                    </span>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={attachmentMutation.isPending} onClick={() => attachmentMutation.mutate(attachment)}>
                      {t("attachments.open")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t("cancel.title")}
        size="sm"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCancelOpen(false)} disabled={cancelMutation.isPending}>{t("cancel.keep")}</button>
            <button type="button" className="btn btn-danger" onClick={submitCancel} disabled={cancelMutation.isPending}>{t("cancel.confirm")}</button>
          </>
        }
      >
        <p className="mb-3 text-sm">{t("cancel.message")}</p>
        <label htmlFor="cancel-reason" className="label">{t("cancel.reason")}</label>
        <textarea id="cancel-reason" rows={3} maxLength={400} className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(reasonError)} />
        {reasonError && <p className="field-error" role="alert">{reasonError}</p>}
      </Modal>
    </div>
  );
}

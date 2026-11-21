import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EmptyState, ErrorState, Modal, Spinner, StatusBadge, useLocalized, useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { approveApplication, fetchAttachment, getApplication, getServiceVersion, rejectApplication, revokeCredential, startReview } from "../api";
import { ApproveModal, RejectModal, RevokeModal } from "../components/DecisionModals";

function Section({ title, children, badge }) {
  return (
    <section className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

export default function ReviewDetailPage() {
  const { applicationId } = useParams();
  const { t, i18n } = useTranslation("admin-review");
  const { localize } = useLocalized();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState(null); // "approve" | "reject" | "revoke" | null
  const [preview, setPreview] = useState(null); // { url, name } of an image being previewed

  const applicationQuery = useQuery({ queryKey: ["admin", "applications", applicationId], queryFn: () => getApplication(applicationId) });
  const application = applicationQuery.data;

  // labels for the answers come from the version the application was submitted under; raw keys are the fallback
  const definitionQuery = useQuery({
    queryKey: ["admin", "services", application?.service.id, "versions", application?.serviceVersion],
    queryFn: () => getServiceVersion(application.service.id, application.serviceVersion),
    enabled: Boolean(application),
    retry: false,
  });
  const fields = definitionQuery.data?.definition.formSchema.fields || [];

  // an object URL for an image preview must be freed when the preview closes
  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview]);

  const afterAction = (messageKey) => {
    toast.success(t(messageKey));
    queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "deliveries"] });
    setModal(null);
  };

  const onActionError = (error) => {
    if (error.code === "INVALID_STATUS_TRANSITION") {
      // someone else already acted: reload and say so
      toast.error(t("changedMeanwhile"));
      queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
      setModal(null);
    } else {
      toast.error(getErrorMessage(error, t));
    }
  };

  const startMutation = useMutation({ mutationFn: () => startReview(applicationId), onSuccess: () => afterAction("start.success"), onError: onActionError });
  const approveMutation = useMutation({ mutationFn: (note) => approveApplication(applicationId, note), onSuccess: () => afterAction("approve.success"), onError: onActionError });
  const rejectMutation = useMutation({ mutationFn: ({ code, reason }) => rejectApplication(applicationId, code, reason), onSuccess: () => afterAction("reject.success"), onError: onActionError });
  const revokeMutation = useMutation({
    mutationFn: (reason) => revokeCredential(application.credential.id, reason),
    onSuccess: () => afterAction("revoke.success"),
    onError: (error) => {
      if (error.code === "CREDENTIAL_NOT_ACTIVE") queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
      toast.error(getErrorMessage(error, t));
      setModal(null);
    },
  });
  // one request at a time: every action button is disabled while any of them runs
  const busy = [startMutation, approveMutation, rejectMutation, revokeMutation].some((mutation) => mutation.isPending);

  const previewMutation = useMutation({
    mutationFn: (attachment) => fetchAttachment(applicationId, attachment.id).then((file) => ({ ...file, attachment })),
    onSuccess: ({ blob, url, attachment }) => {
      if (blob.type.startsWith("image/")) return setPreview({ url, name: attachment.originalName });
      // a PDF opens in a new tab, and the URL is freed afterwards
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    },
    onError: (error) => toast.error(getErrorMessage(error, t)),
  });

  if (applicationQuery.isLoading) return <Spinner />;
  if (applicationQuery.isError) {
    if (applicationQuery.error.code === "APPLICATION_NOT_FOUND") {
      return <EmptyState title={t("detail.notFoundTitle")} text={t("detail.notFoundText")} action={<Link to="/admin/applications" className="btn btn-primary">{t("detail.back")}</Link>} />;
    }
    return <ErrorState error={applicationQuery.error} onRetry={applicationQuery.refetch} />;
  }

  const { citizen, decision, credential, deliveryRecord, payment, deliveryAddress } = application;
  const labelOf = (key) => {
    const field = fields.find((f) => f.key === key);
    return field ? localize(field.label) : key;
  };
  const valueOf = (key, value) => {
    const field = fields.find((f) => f.key === key);
    if (!field) return String(value);
    if (field.type === "CHECKBOX") return value ? t("yes") : t("no");
    if (field.type === "DATE") return formatDate(value, i18n.language);
    if (field.type === "SELECT") return localize((field.options || []).find((o) => o.value === value)?.label) || String(value);
    return String(value);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link to="/admin/applications" className="link text-sm">{t("detail.back")}</Link>

      <header className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="page-title">{application.applicationNumber}</h1>
            <p className="text-sm text-muted">{localize(application.service.name)} · {t("detail.version", { version: application.serviceVersion })}</p>
          </div>
          <StatusBadge kind="application" value={application.status} />
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm">
          <div><dt className="text-muted">{t("columns.submitted")}</dt><dd className="font-semibold">{formatDateTime(application.submittedAt, i18n.language)}</dd></div>
          <div className="flex items-center gap-2">
            <div><dt className="text-muted">{t("columns.due")}</dt><dd className="font-semibold">{formatDate(application.dueAt, i18n.language)}</dd></div>
            {application.isOverdue && <span className="badge bg-red-100 text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]"><span className="material-icons me-1" aria-hidden="true">schedule</span>{t("overdue")}</span>}
          </div>
        </dl>

        {/* the buttons depend on the status; other statuses show no decision buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {application.status === "SUBMITTED" && (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => startMutation.mutate()}>{t("start.button")}</button>
          )}
          {application.status === "UNDER_REVIEW" && (
            <>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setModal("approve")}>{t("approve.button")}</button>
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setModal("reject")}>{t("reject.button")}</button>
            </>
          )}
          {credential?.status === "ACTIVE" && (
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => setModal("revoke")}>{t("revoke.button")}</button>
          )}
        </div>
      </header>

      <Section
        title={t("citizen.title")}
        badge={<span className="badge bg-amber-100 text-warning dark:bg-[#3d3010] dark:text-[#f0c36a]"><span className="material-icons me-1" aria-hidden="true">lock</span>{t("citizen.confidential")}</span>}
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["citizen.fullName", citizen.fullName], ["citizen.nationalId", citizen.nationalId], ["citizen.birthDate", formatDate(citizen.birthDate, i18n.language)],
            ["citizen.gender", t(`gender.${citizen.gender}`)], ["citizen.email", citizen.email], ["citizen.phone", citizen.phone],
          ].map(([key, value]) => (
            <div key={key}><dt className="text-xs text-muted">{t(key)}</dt><dd className="font-semibold" dir="auto">{value || "—"}</dd></div>
          ))}
        </dl>
      </Section>

      <Section title={t("answers.title")}>
        {Object.keys(application.data || {}).length === 0 ? (
          <p className="text-sm text-muted">{t("answers.none")}</p>
        ) : (
          <dl className="divide-y divide-line dark:divide-[#2f3670]">
            {Object.entries(application.data).map(([key, value]) => (
              <div key={key} className="grid gap-1 py-2 sm:grid-cols-3">
                <dt className="text-sm text-muted">{labelOf(key)}</dt>
                <dd className="font-semibold sm:col-span-2" dir="auto">{valueOf(key, value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={t("address.title")}>
          {deliveryAddress ? (
            <p className="text-sm">{deliveryAddress.governorate} · {deliveryAddress.city}<br />{deliveryAddress.addressLine}<br /><span dir="ltr">{deliveryAddress.phone}</span>{deliveryAddress.notes && <><br />{deliveryAddress.notes}</>}</p>
          ) : <p className="text-sm text-muted">—</p>}
        </Section>
        <Section title={t("payment.title")} badge={<StatusBadge kind="payment" value={payment.status} />}>
          <p className="text-sm font-semibold">{formatMoney(payment.amount, i18n.language)}</p>
          {payment.reference && <p className="text-xs text-muted">{t("payment.reference")}: <span dir="ltr">{payment.reference}</span></p>}
          {payment.paidAt && <p className="text-xs text-muted">{formatDateTime(payment.paidAt, i18n.language)}</p>}
        </Section>
      </div>

      <Section title={t("attachments.title")}>
        {application.attachments.length === 0 ? (
          <p className="text-sm text-muted">{t("attachments.none")}</p>
        ) : (
          <ul className="divide-y divide-line dark:divide-[#2f3670]">
            {application.attachments.map((attachment) => (
              <li key={attachment.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span><span className="font-semibold" dir="auto">{attachment.originalName}</span><span className="text-muted"> · {attachment.requirementKey} · {attachment.mimeType}</span></span>
                <button type="button" className="btn btn-secondary btn-sm" disabled={previewMutation.isPending} onClick={() => previewMutation.mutate(attachment)}>{t("attachments.preview")}</button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("history.title")}>
        <ol className="space-y-2 text-sm">
          {application.statusHistory.map((entry, index) => (
            <li key={`${entry.status}-${index}`} className="flex flex-wrap items-baseline gap-x-3">
              <StatusBadge kind="application" value={entry.status} />
              <span className="text-muted">{formatDateTime(entry.at, i18n.language)}</span>
              <span>{entry.by ? `${entry.by.fullName} (${t(`roles.${entry.by.role}`)})` : t("history.system")}</span>
              {entry.note && <span className="text-muted">— {entry.note}</span>}
            </li>
          ))}
        </ol>
      </Section>

      {decision && (
        <Section title={t("decision.title")}>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div><dt className="text-xs text-muted">{t("decision.outcome")}</dt><dd className="font-semibold">{t(`decision.${decision.outcome}`)}</dd></div>
            <div><dt className="text-xs text-muted">{t("decision.decidedAt")}</dt><dd className="font-semibold">{formatDateTime(decision.decidedAt, i18n.language)}</dd></div>
            <div><dt className="text-xs text-muted">{t("decision.decidedBy")}</dt><dd className="font-semibold">{decision.decidedBy?.fullName || t("history.system")}</dd></div>
            {decision.reason && <div className="sm:col-span-2"><dt className="text-xs text-muted">{t("decision.reason")}</dt><dd>{decision.reasonCode ? `${t(`reasonCodes.${decision.reasonCode}`, { defaultValue: decision.reasonCode })}: ` : ""}{decision.reason}</dd></div>}
          </dl>
        </Section>
      )}

      {credential && (
        <Section title={t("credential.title")} badge={<StatusBadge kind="credential" value={credential.status} />}>
          {/* the QR token is never shown as text */}
          <dl className="grid gap-3 sm:grid-cols-3 text-sm">
            <div><dt className="text-xs text-muted">{t("credential.number")}</dt><dd dir="ltr" className="font-mono font-semibold">{credential.number}</dd></div>
            <div><dt className="text-xs text-muted">{t("credential.issuedAt")}</dt><dd className="font-semibold">{formatDate(credential.issuedAt, i18n.language)}</dd></div>
            <div><dt className="text-xs text-muted">{t("credential.expiresAt")}</dt><dd className="font-semibold">{credential.expiresAt ? formatDate(credential.expiresAt, i18n.language) : t("credential.noExpiry")}</dd></div>
          </dl>
        </Section>
      )}

      {deliveryRecord && (
        <Section title={t("delivery.title")} badge={<StatusBadge kind="delivery" value={deliveryRecord.status} />}>
          <p className="text-sm">
            {t("delivery.agent")}: <span className="font-semibold">{deliveryRecord.agent ? deliveryRecord.agent.fullName : t("delivery.unassigned")}</span>
            {" · "}{t("delivery.attempts", { count: deliveryRecord.attempts })}
          </p>
          <Link to="/admin/deliveries" className="link mt-2 inline-block text-sm">{t("delivery.open")}</Link>
        </Section>
      )}

      <ApproveModal open={modal === "approve"} onClose={() => setModal(null)} busy={busy} onSubmit={(note) => approveMutation.mutate(note)} />
      <RejectModal open={modal === "reject"} onClose={() => setModal(null)} busy={busy} onSubmit={(code, reason) => rejectMutation.mutate({ code, reason })} />
      <RevokeModal open={modal === "revoke"} onClose={() => setModal(null)} busy={busy} onSubmit={(reason) => revokeMutation.mutate(reason)} />

      <Modal open={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.name || ""} size="lg" footer={<button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>{t("modal.close")}</button>}>
        {preview && <img src={preview.url} alt={preview.name} className="mx-auto max-h-[60vh] rounded-xl" />}
      </Modal>
    </div>
  );
}

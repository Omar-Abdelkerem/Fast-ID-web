import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/lib/api";
import { formatDateTime, formatMoney, maskNationalId } from "@/lib/format";
import { BrandLogo } from "./BrandLogo";
import { Spinner } from "./Spinner";
import { PageHeader } from "./PageHeader";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { Pagination } from "./Pagination";
import { StatusBadge } from "./StatusBadge";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";
import { FormField } from "./FormField";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useToast } from "./ToastProvider";
import { useLocalized } from "@/i18n/useLocalized";

const APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const DELIVERY_STATUSES = [
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED_ATTEMPT",
];

const CREDENTIAL_STATUSES = ["ACTIVE", "REVOKED", "EXPIRED"];
const PAYMENT_STATUSES = ["NOT_REQUIRED", "UNPAID", "PAID"];

export function DevUiPage() {
  const { t, i18n } = useTranslation("common");
  const { localize } = useLocalized();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [page, setPage] = useState(3);
  const [sampleText, setSampleText] = useState("");

  const sampleLocalized = {
    ar: "بطاقة الرقم القومي",
    en: "National ID Card",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-2">
      <PageHeader
        title={t("pages.devUiTitle")}
        subtitle={t("pages.devUiSubtitle")}
        actions={
          <>
            <LanguageSwitcher />
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => toast.success(t("buttons.confirm"))}
            >
              {t("buttons.confirm")}
            </button>
          </>
        }
      />

      {/* Brand gradient hero banner matching Case Study Page 1 & Page 9 */}
      <section className="brand-gradient rounded-2xl p-6 text-white shadow-card">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <BrandLogo variant="dark" />
            <p className="text-sm text-white/85">{t("app.tagline")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/90">
            <span className="rounded-lg bg-white/15 px-3 py-1.5 ltr-value font-mono">
              {maskNationalId("29905140112358")}
            </span>
            <span className="rounded-lg bg-white/15 px-3 py-1.5">
              {formatMoney({ amount: 5000, currency: "EGP" }, i18n.language)}
            </span>
            <span className="rounded-lg bg-white/15 px-3 py-1.5">
              {formatDateTime("2026-11-21T10:30:00.000Z", i18n.language)}
            </span>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-heading text-base font-bold text-navy">
          {localize(sampleLocalized)}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => toast.success(t("status.application.APPROVED"))}
          >
            {t("buttons.save")}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => toast.info(t("status.delivery.OUT_FOR_DELIVERY"))}
          >
            {t("buttons.cancel")}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => toast.error(t("errors.RATE_LIMITED"))}
          >
            {t("buttons.delete")}
          </button>
          <button
            type="button"
            className="btn-navy btn-sm"
            onClick={() => setModalOpen(true)}
          >
            {t("buttons.view")}
          </button>
          <button
            type="button"
            className="btn-danger btn-sm"
            onClick={() => setConfirmOpen(true)}
          >
            {t("buttons.confirm")}
          </button>
          <button type="button" className="btn-primary" disabled>
            {t("buttons.submit")}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-heading text-base font-bold text-navy">
          {t("nav.applications")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {APPLICATION_STATUSES.map((status) => (
            <StatusBadge key={status} kind="application" value={status} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {DELIVERY_STATUSES.map((status) => (
            <StatusBadge key={status} kind="delivery" value={status} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {CREDENTIAL_STATUSES.map((status) => (
            <StatusBadge key={status} kind="credential" value={status} />
          ))}
          {PAYMENT_STATUSES.map((status) => (
            <StatusBadge key={status} kind="payment" value={status} />
          ))}
        </div>
      </section>

      <section className="card">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t("pages.devLoginIdentifier")}
            htmlFor="dev-ui-input"
            hint={t("pages.devLoginHint")}
            required
          >
            <input
              id="dev-ui-input"
              className="input ltr-value"
              value={sampleText}
              onChange={(event) => setSampleText(event.target.value)}
            />
          </FormField>

          <FormField
            label={t("pages.devLoginPassword")}
            htmlFor="dev-ui-error"
            error={t("errors.REQUIRED")}
            required
          >
            <input id="dev-ui-error" className="input" defaultValue="" />
          </FormField>
        </div>
      </section>

      <section className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t("nav.services")}</th>
              <th>{t("app.phone")}</th>
              <th>{t("status.payment.PAID")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-semibold">{localize(sampleLocalized)}</td>
              <td>
                <span className="ltr-value text-muted">01012345678</span>
              </td>
              <td>
                <StatusBadge kind="payment" value="PAID" />
              </td>
            </tr>
            <tr>
              <td className="font-semibold">{t("categories.LICENSE")}</td>
              <td>
                <span className="ltr-value text-muted">APP-2026-000123</span>
              </td>
              <td>
                <StatusBadge kind="application" value="UNDER_REVIEW" />
              </td>
            </tr>
          </tbody>
        </table>

        <Pagination
          meta={{ page, pageSize: 20, total: 140, totalPages: 7 }}
          onPageChange={setPage}
        />
      </section>

      <EmptyState
        title={t("states.empty")}
        text={t("states.noResults")}
        action={
          <button type="button" className="btn-secondary btn-sm">
            {t("buttons.resetFilters")}
          </button>
        }
      />

      <ErrorState
        error={new ApiError({ code: "NETWORK_ERROR", status: 0 })}
        onRetry={() => toast.info(t("buttons.retry"))}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("pages.devUiTitle")}
        footer={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setModalOpen(false)}
          >
            {t("buttons.close")}
          </button>
        }
      >
        <p>{t("pages.devUiSubtitle")}</p>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title={t("buttons.delete")}
        message={t("states.unsavedChanges")}
        danger
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast.success(t("buttons.confirm"));
        }}
      />
    </div>
  );
}

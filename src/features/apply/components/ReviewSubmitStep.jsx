import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ConfirmDialog, StatusBadge, useLocalized, useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getGovernorates } from "../api";

export default function ReviewSubmitStep({
  service,
  application,
  onEditStep,
  onPayMock,
  isPaying,
  onSubmit,
  isSubmitting,
  onDiscard,
  isDiscarding,
  onNotEditable,
}) {
  const { t, i18n } = useTranslation("apply");
  const { localize } = useLocalized();
  const toast = useToast();

  const feeBoxRef = useRef(null);
  const [paymentDisabled, setPaymentDisabled] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const { data: governorates = [] } = useQuery({
    queryKey: ["reference", "governorates"],
    queryFn: getGovernorates,
    staleTime: 1000 * 60 * 60,
  });

  const fields = service?.formSchema?.fields || [];
  const requiredDocs = service?.requiredDocuments || [];
  const attachments = application?.attachments || [];
  const address = application?.deliveryAddress;
  const payment = application?.payment;

  function formatAnswer(field) {
    const val = application?.data?.[field.key];
    if (val === undefined || val === null || val === "") {
      return t("review.emptyValue");
    }
    if (field.type === "CHECKBOX") {
      return val ? t("review.yes") : t("review.no");
    }
    if (field.type === "SELECT") {
      const option = (field.options || []).find((opt) => opt.value === val);
      return option ? localize(option.label) : String(val);
    }
    return String(val);
  }

  function getGovernorateLabel(code) {
    const match = governorates.find((g) => g.code === code);
    return match ? localize(match.name) : code;
  }

  async function handlePayClick() {
    try {
      await onPayMock();
      toast.success(t("review.toasts.paid"));
    } catch (err) {
      if (err.code === "APPLICATION_NOT_EDITABLE") {
        onNotEditable();
        return;
      }
      if (err.code === "PAYMENT_NOT_ENABLED") {
        setPaymentDisabled(true);
        return;
      }
      toast.error(getErrorMessage(err, t));
    }
  }

  async function handleSubmitClick() {
    try {
      await onSubmit();
    } catch (err) {
      if (err.code === "PAYMENT_NOT_COMPLETED" && feeBoxRef.current) {
        feeBoxRef.current.focus();
        feeBoxRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  async function handleConfirmDiscard() {
    try {
      await onDiscard();
      setDiscardOpen(false);
    } catch (err) {
      setDiscardOpen(false);
      if (err.code === "APPLICATION_NOT_EDITABLE") {
        onNotEditable();
        return;
      }
      toast.error(getErrorMessage(err, t));
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#D9E1F4] pb-3">
        <h2 className="text-lg font-bold text-[#252C68]">{t("review.title")}</h2>
        <p className="mt-1 text-sm text-[#68769D]">{t("review.subtitle")}</p>
      </div>

      {/* Section 1: Details */}
      <section className="rounded-xl border border-[#D9E1F4] bg-[#E7EEFC]/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[#252C68]">{t("review.sections.details")}</h3>
          <button
            type="button"
            className="link text-xs font-medium"
            onClick={() => onEditStep(1)}
          >
            {t("review.edit")}
          </button>
        </div>

        {fields.length === 0 ? (
          <p className="text-sm text-[#68769D]">{t("form.noFields")}</p>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.key}>
                <dt className="text-xs text-[#68769D]">{localize(field.label)}</dt>
                <dd className="mt-0.5 text-sm font-medium text-[#252C68]">
                  {formatAnswer(field)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* Section 2: Documents */}
      <section className="rounded-xl border border-[#D9E1F4] bg-[#E7EEFC]/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[#252C68]">{t("review.sections.documents")}</h3>
          <button
            type="button"
            className="link text-xs font-medium"
            onClick={() => onEditStep(2)}
          >
            {t("review.edit")}
          </button>
        </div>

        {requiredDocs.length === 0 ? (
          <p className="text-sm text-[#68769D]">{t("documents.empty")}</p>
        ) : (
          <ul className="divide-y divide-[#D9E1F4] text-sm">
            {requiredDocs.map((reqDoc) => {
              const file = attachments.find((a) => a.requirementKey === reqDoc.key);
              return (
                <li
                  key={reqDoc.key}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                >
                  <span className="font-medium text-[#252C68]">{localize(reqDoc.label)}</span>
                  {file ? (
                    <span className="text-xs text-success font-medium">
                      {file.originalName}
                    </span>
                  ) : (
                    <span className="text-xs text-danger">
                      {reqDoc.required ? t("review.missingDocument") : t("review.emptyValue")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Section 3: Delivery Address */}
      <section className="rounded-xl border border-[#D9E1F4] bg-[#E7EEFC]/30 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-[#252C68]">{t("review.sections.delivery")}</h3>
          <button
            type="button"
            className="link text-xs font-medium"
            onClick={() => onEditStep(3)}
          >
            {t("review.edit")}
          </button>
        </div>

        {!address ? (
          <p className="text-sm text-[#68769D]">{t("review.noAddress")}</p>
        ) : (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-[#68769D]">{t("delivery.governorate")}</dt>
              <dd className="mt-0.5 font-medium text-[#252C68]">
                {getGovernorateLabel(address.governorate)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#68769D]">{t("delivery.city")}</dt>
              <dd className="mt-0.5 font-medium text-[#252C68]">{address.city}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-[#68769D]">{t("delivery.addressLine")}</dt>
              <dd className="mt-0.5 font-medium text-[#252C68]">{address.addressLine}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#68769D]">{t("delivery.phone")}</dt>
              <dd className="mt-0.5 font-medium text-[#252C68]" dir="ltr">
                {address.phone}
              </dd>
            </div>
            {address.notes && (
              <div>
                <dt className="text-xs text-[#68769D]">{t("delivery.notes")}</dt>
                <dd className="mt-0.5 font-medium text-[#252C68]">{address.notes}</dd>
              </div>
            )}
          </dl>
        )}
      </section>

      {/* Section 4: Fee & Demo Payment Box */}
      <section
        ref={feeBoxRef}
        tabIndex={-1}
        className="rounded-xl border border-[#D9E1F4] bg-white p-4 focus:outline-none focus:ring-2 focus:ring-[#4765F4]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[#252C68]">{t("review.sections.payment")}</h3>
            <p className="mt-1 text-lg font-bold text-[#252C68]">
              {payment?.status === "NOT_REQUIRED"
                ? t("review.noFee")
                : formatMoney(payment?.amount || service.fee, i18n.language)}
            </p>
          </div>
          {payment?.status && <StatusBadge kind="payment" value={payment.status} />}
        </div>

        {payment?.status === "UNPAID" && (
          <div className="mt-4 border-t border-[#D9E1F4] pt-3">
            {paymentDisabled ? (
              <p role="alert" className="text-sm text-danger">
                {t("review.paymentNotEnabled")}
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#68769D]">{t("review.paymentDemoHint")}</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isPaying || isSubmitting}
                  onClick={handlePayClick}
                >
                  {isPaying ? t("review.paying") : t("review.payDemo")}
                </button>
              </div>
            )}
          </div>
        )}

        {payment?.status === "PAID" && (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-[#D9E1F4] pt-3 text-xs text-[#68769D]">
            {payment.reference && (
              <span>{t("review.paymentReference", { ref: payment.reference })}</span>
            )}
            {payment.paidAt && (
              <span>
                {t("review.paymentDate", {
                  date: formatDateTime(payment.paidAt, i18n.language),
                })}
              </span>
            )}
          </div>
        )}
      </section>

      {/* Action Bar: Submit + P1 Discard Draft */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D9E1F4] pt-4">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={isSubmitting || isDiscarding}
          onClick={() => setDiscardOpen(true)}
        >
          {t("review.discardDraft")}
        </button>

        <button
          type="button"
          className="btn btn-primary"
          disabled={isSubmitting || isPaying}
          onClick={handleSubmitClick}
        >
          {isSubmitting ? t("review.submitting") : t("review.submit")}
        </button>
      </div>

      <ConfirmDialog
        open={discardOpen}
        title={t("review.discardTitle")}
        message={t("review.discardMessage")}
        confirmText={t("review.discardConfirm")}
        danger
        isLoading={isDiscarding}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  );
}

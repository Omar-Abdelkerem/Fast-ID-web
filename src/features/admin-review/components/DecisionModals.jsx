import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormField, Modal } from "@/components";

const REJECT_CODES = ["INCOMPLETE_DOCUMENTS", "UNCLEAR_DOCUMENTS", "INVALID_DATA", "DUPLICATE_REQUEST", "OTHER"];

function Footer({ onClose, onConfirm, confirmText, danger, busy }) {
  const { t } = useTranslation("admin-review");
  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>{t("modal.cancel")}</button>
      <button type="button" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>{confirmText}</button>
    </>
  );
}

// Approve: an optional internal note (up to 500 characters)
export function ApproveModal({ open, onClose, onSubmit, busy }) {
  const { t } = useTranslation("admin-review");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function confirm() {
    if (note.trim().length > 500) return setError(t("validation.noteTooLong"));
    setError("");
    onSubmit(note.trim());
  }

  return (
    <Modal open={open} onClose={onClose} title={t("approve.title")} footer={<Footer onClose={onClose} onConfirm={confirm} confirmText={t("approve.confirm")} busy={busy} />}>
      <p className="mb-3 text-sm">{t("approve.message")}</p>
      <FormField label={t("approve.note")} htmlFor="approve-note" error={error} hint={t("approve.noteHint")}>
        <textarea id="approve-note" rows={3} maxLength={600} className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
    </Modal>
  );
}

// Reject: a reason code and a reason (10 to 500 characters) that the citizen will read
export function RejectModal({ open, onClose, onSubmit, busy }) {
  const { t } = useTranslation("admin-review");
  const [reasonCode, setReasonCode] = useState("INCOMPLETE_DOCUMENTS");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function confirm() {
    const length = reason.trim().length;
    if (length < 10 || length > 500) return setError(t("validation.reasonLength"));
    setError("");
    onSubmit(reasonCode, reason.trim());
  }

  return (
    <Modal open={open} onClose={onClose} title={t("reject.title")} footer={<Footer onClose={onClose} onConfirm={confirm} confirmText={t("reject.confirm")} danger busy={busy} />}>
      <div className="space-y-3">
        <FormField label={t("reject.reasonCode")} htmlFor="reject-code">
          <select id="reject-code" className="select" value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
            {REJECT_CODES.map((code) => <option key={code} value={code}>{t(`reasonCodes.${code}`)}</option>)}
          </select>
        </FormField>
        <FormField label={t("reject.reason")} htmlFor="reject-reason" error={error} hint={t("reject.reasonHint")} required>
          <textarea id="reject-reason" rows={4} maxLength={600} className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(error)} />
        </FormField>
        <p className="flex items-start gap-1 rounded-xl bg-amber-100 p-2 text-xs text-warning dark:bg-[#3d3010] dark:text-[#f0c36a]">
          <span className="material-icons" aria-hidden="true">visibility</span>
          {t("reject.visibleToCitizen")}
        </p>
      </div>
    </Modal>
  );
}

// Revoke a credential: a required reason (10 to 500 characters), stored in the audit log
export function RevokeModal({ open, onClose, onSubmit, busy }) {
  const { t } = useTranslation("admin-review");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function confirm() {
    const length = reason.trim().length;
    if (length < 10 || length > 500) return setError(t("validation.reasonLength"));
    setError("");
    onSubmit(reason.trim());
  }

  return (
    <Modal open={open} onClose={onClose} title={t("revoke.title")} footer={<Footer onClose={onClose} onConfirm={confirm} confirmText={t("revoke.confirm")} danger busy={busy} />}>
      <p className="mb-3 text-sm">{t("revoke.message")}</p>
      <FormField label={t("revoke.reason")} htmlFor="revoke-reason" error={error} hint={t("revoke.reasonHint")} required>
        <textarea id="revoke-reason" rows={3} maxLength={600} className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(error)} />
      </FormField>
    </Modal>
  );
}

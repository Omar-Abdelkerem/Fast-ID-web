import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocalized, useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { deleteAttachment, uploadAttachment } from "../api";

const MIME_LABELS = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "application/pdf": "PDF",
};

function formatAllowedTypes(mimeTypes = []) {
  return mimeTypes.map((m) => MIME_LABELS[m] || m).join(", ");
}

function formatBytesToMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(bytes >= 1024 * 1024 ? 1 : 2);
}

export default function DocumentsStep({
  applicationId,
  requiredDocuments = [],
  attachments = [],
  highlightedKeys = [],
  onAttachmentsChange,
  onNotEditable,
}) {
  const { t } = useTranslation("apply");
  const { localize } = useLocalized();
  const toast = useToast();

  const [progressByKey, setProgressByKey] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [errorByKey, setErrorByKey] = useState({});

  if (requiredDocuments.length === 0) {
    return <p className="py-6 text-center text-sm text-[#68769D]">{t("documents.empty")}</p>;
  }

  async function handleFileSelect(reqDoc, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const typesLabel = formatAllowedTypes(reqDoc.allowedMimeTypes);
    const maxMb = formatBytesToMb(reqDoc.maxSizeBytes);

    if (!reqDoc.allowedMimeTypes.includes(file.type)) {
      setErrorByKey((prev) => ({
        ...prev,
        [reqDoc.key]: t("documents.clientErrors.unsupportedType", { types: typesLabel }),
      }));
      return;
    }

    if (file.size > reqDoc.maxSizeBytes) {
      setErrorByKey((prev) => ({
        ...prev,
        [reqDoc.key]: t("documents.clientErrors.tooLarge", { maxMb }),
      }));
      return;
    }

    setErrorByKey((prev) => ({ ...prev, [reqDoc.key]: null }));
    setProgressByKey((prev) => ({ ...prev, [reqDoc.key]: 0 }));

    try {
      const uploaded = await uploadAttachment(applicationId, reqDoc.key, file, {
        onProgress: (percent) => {
          setProgressByKey((prev) => ({ ...prev, [reqDoc.key]: percent }));
        },
      });

      // Derive the new list from the latest parent state, never the list
      // captured before an overlapping upload started.
      onAttachmentsChange((current = []) => [
        ...current.filter((att) => att.requirementKey !== reqDoc.key),
        uploaded,
      ]);
      toast.success(t("documents.toasts.uploaded"));
    } catch (err) {
      if (err.code === "APPLICATION_NOT_EDITABLE") {
        onNotEditable();
        return;
      }
      const msg = getErrorMessage(err, t);
      setErrorByKey((prev) => ({ ...prev, [reqDoc.key]: msg }));
      toast.error(msg);
    } finally {
      setProgressByKey((prev) => {
        const copy = { ...prev };
        delete copy[reqDoc.key];
        return copy;
      });
    }
  }

  async function handleDelete(reqKey, attachmentId) {
    setDeletingId(attachmentId);
    setErrorByKey((prev) => ({ ...prev, [reqKey]: null }));

    try {
      await deleteAttachment(applicationId, attachmentId);
      onAttachmentsChange((current = []) =>
        current.filter((att) => att.id !== attachmentId)
      );
      toast.success(t("documents.toasts.deleted"));
    } catch (err) {
      if (err.code === "APPLICATION_NOT_EDITABLE") {
        onNotEditable();
        return;
      }
      const msg = getErrorMessage(err, t);
      setErrorByKey((prev) => ({ ...prev, [reqKey]: msg }));
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="border-b border-[#D9E1F4] pb-3">
        <h2 className="text-lg font-bold text-[#252C68]">{t("documents.title")}</h2>
        <p className="mt-1 text-sm text-[#68769D]">{t("documents.subtitle")}</p>
      </div>

      <ul className="space-y-4">
        {requiredDocuments.map((reqDoc) => {
          const existing = attachments.find((a) => a.requirementKey === reqDoc.key);
          const progress = progressByKey[reqDoc.key];
          const isUploading = progress !== undefined;
          const isDeleting = existing && deletingId === existing.id;
          const rowError = errorByKey[reqDoc.key];
          const isHighlighted = highlightedKeys.includes(reqDoc.key) && !existing;

          const typesLabel = formatAllowedTypes(reqDoc.allowedMimeTypes);
          const maxMb = formatBytesToMb(reqDoc.maxSizeBytes);
          const inputId = `doc-upload-${reqDoc.key}`;

          return (
            <li
              key={reqDoc.key}
              className={`rounded-xl border p-4 transition ${
                isHighlighted
                  ? "border-danger bg-danger/5 ring-2 ring-danger/20"
                  : "border-[#D9E1F4] bg-[#E7EEFC]/35"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-[#252C68]">
                      {localize(reqDoc.label)}
                    </span>
                    <span
                      className={`badge text-xs ${
                        reqDoc.required
                          ? "bg-danger/10 text-danger"
                          : "bg-[#E7EEFC] text-[#68769D]"
                      }`}
                    >
                      {reqDoc.required ? t("documents.required") : t("documents.optional")}
                    </span>
                    {existing && (
                      <span className="badge bg-success/15 text-success text-xs">
                        {t("documents.uploaded")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#68769D]">
                    {t("documents.allowedMeta", { types: typesLabel, maxMb })}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label
                    htmlFor={inputId}
                    className={`btn btn-sm cursor-pointer ${
                      existing ? "btn-secondary" : "btn-primary"
                    } ${isUploading || isDeleting ? "pointer-events-none opacity-60" : ""}`}
                  >
                    {existing ? t("documents.replaceFile") : t("documents.chooseFile")}
                    <input
                      id={inputId}
                      type="file"
                      accept={reqDoc.allowedMimeTypes.join(",")}
                      disabled={isUploading || isDeleting}
                      onChange={(e) => handleFileSelect(reqDoc, e)}
                      className="sr-only"
                    />
                  </label>

                  {existing && (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      disabled={isUploading || isDeleting}
                      onClick={() => handleDelete(reqDoc.key, existing.id)}
                    >
                      {t("documents.deleteFile")}
                    </button>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="mt-3 space-y-1" aria-live="polite">
                  <p className="text-xs font-medium text-[#68769D]">
                    {t("documents.uploading", { percent: progress })}
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E7EEFC]">
                    <div
                      className="h-full bg-[#4765F4] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {existing && !isUploading && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D9E1F4] bg-white px-3 py-2 text-xs">
                  <span className="font-medium text-[#252C68] truncate">
                    {existing.originalName}
                  </span>
                  <span className="text-[#68769D]">
                    {MIME_LABELS[existing.mimeType] || existing.mimeType} ·{" "}
                    {formatBytesToMb(existing.sizeBytes)} MB
                  </span>
                </div>
              )}

              {existing && !isUploading && (
                <p className="mt-1.5 text-xs text-[#68769D]">{t("documents.replaceHint")}</p>
              )}

              {rowError && (
                <p role="alert" className="field-error mt-2">
                  {rowError}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { getErrorMessage } from "@/lib/errors";

export { LanguageSwitcher, ThemeSwitcher } from "./Switchers";

export const Spinner = ({ size = "md" }) => {
  const { t } = useTranslation();
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-10 w-10" };
  return (
    <div role="status" aria-label={t("loading")} className="flex justify-center py-6">
      <span className={`${sizes[size] || sizes.md} animate-spin rounded-full border-2 border-terracotta-dark border-t-transparent`} />
    </div>
  );
};

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const EmptyState = ({ title, text, action }) => (
  <div className="card py-10 text-center">
    <p className="font-bold">{title}</p>
    {text && <p className="mt-1 text-sm text-muted">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ error, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div role="alert" className="card py-10 text-center">
      <p className="font-semibold text-danger">{getErrorMessage(error, t)}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary mt-4" onClick={onRetry}>
          {t("retry")}
        </button>
      )}
    </div>
  );
};

// meta is the contract's { page, pageSize, total, totalPages }
export const Pagination = ({ meta, onPageChange }) => {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-center gap-3" aria-label="pagination">
      <button type="button" className="btn btn-secondary btn-sm" disabled={meta.page <= 1} onClick={() => onPageChange(meta.page - 1)} aria-label="previous">
        <span className="material-icons rtl:rotate-180" aria-hidden="true">chevron_left</span>
      </button>
      <span className="text-sm">
        {meta.page} / {meta.totalPages}
      </span>
      <button type="button" className="btn btn-secondary btn-sm" disabled={meta.page >= meta.totalPages} onClick={() => onPageChange(meta.page + 1)} aria-label="next">
        <span className="material-icons rtl:rotate-180" aria-hidden="true">chevron_right</span>
      </button>
    </nav>
  );
};

// the colour never carries the meaning alone: the label is always shown
const tones = {
  neutral: "bg-beige text-espresso ring-1 ring-line dark:bg-[#232963] dark:text-[#E8F0FE] dark:ring-[#2f3670]",
  info: "bg-beige text-terracotta-dark dark:bg-[#232963] dark:text-[#8da0ff]",
  warning: "bg-amber-100 text-warning dark:bg-[#3d3010] dark:text-[#f0c36a]",
  success: "bg-green-100 text-success dark:bg-[#17382c] dark:text-[#7fd1a8]",
  danger: "bg-red-100 text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]",
  dark: "bg-espresso text-white dark:bg-[#3b4380]",
};
const statusTone = {
  application: { DRAFT: "neutral", SUBMITTED: "neutral", UNDER_REVIEW: "warning", APPROVED: "success", REJECTED: "danger", OUT_FOR_DELIVERY: "info", DELIVERED: "dark", CANCELLED: "neutral" },
  delivery: { PENDING_ASSIGNMENT: "warning", ASSIGNED: "neutral", OUT_FOR_DELIVERY: "dark", DELIVERED: "success", FAILED_ATTEMPT: "danger" },
  credential: { ACTIVE: "success", REVOKED: "danger", EXPIRED: "neutral" },
  payment: { NOT_REQUIRED: "neutral", UNPAID: "warning", PAID: "success" },
};

// kind: "application" | "delivery" | "credential" | "payment"; value: the enum string (unknown values are shown as they are)
export const StatusBadge = ({ kind = "delivery", value }) => {
  const { t } = useTranslation();
  const tone = statusTone[kind]?.[value] || "neutral";
  return <span className={`badge ${tones[tone]}`}>{t(`status.${value}`, { defaultValue: value })}</span>;
};

// Keeps Tab inside the dialog, closes on Escape, and gives focus back when it closes
function useDialogBehaviour(open, onClose, containerRef) {
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    containerRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !containerRef.current) return;
      const focusable = containerRef.current.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === containerRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, containerRef]);
}

const modalSizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-2xl" };

export function Modal({ open, onClose, title, children, footer, size = "md" }) {
  const ref = useRef(null);
  useDialogBehaviour(open, onClose, ref);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`card w-full ${modalSizes[size] || modalSizes.md} shadow-xl outline-none`}>
        <h2 className="mb-3 text-lg font-bold">{title}</h2>
        {children}
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, title, message, confirmText, danger = false, isLoading = false, onConfirm, onCancel }) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
            {t("cancel")}
          </button>
          <button type="button" className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={isLoading}>
            {confirmText || t("confirm")}
          </button>
        </>
      }
    >
      <p className="text-sm">{message}</p>
    </Modal>
  );
}

export const FormField = ({ label, htmlFor, error, hint, required = false, children }) => (
  <div>
    <label className="label" htmlFor={htmlFor}>
      {label}
      {required && <span className="text-danger" aria-hidden="true"> *</span>}
    </label>
    {children}
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    {error && (
      <p className="field-error" role="alert">
        {error}
      </p>
    )}
  </div>
);

// turns a contract Localized object { ar, en } into the current language's text
export const useLocalized = () => {
  const { i18n } = useTranslation();
  return { localize: (value) => (value ? value[i18n.language] || value.ar || value.en || "" : "") };
};

const ToastContext = createContext({ success() {}, error() {}, info() {} });

const toastStyles = {
  success: { icon: "check_circle", color: "text-success dark:text-[#7fd1a8]" },
  error: { icon: "error", color: "text-danger dark:text-[#ff8a80]" },
  info: { icon: "info", color: "text-terracotta-dark dark:text-[#8da0ff]" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((kind, message) => {
    const id = Math.random();
    setToasts((current) => [...current, { id, kind, message }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4500);
  }, []);
  const api = {
    success: (message) => push("success", message),
    error: (message) => push("error", message),
    info: (message) => push("info", message),
  };

  // the api layer announces a rate limit so every screen gets the same toast
  const { t } = useTranslation();
  useEffect(() => {
    const onRateLimited = () => push("error", t("errors.RATE_LIMITED"));
    window.addEventListener("fid:rate-limited", onRateLimited);
    return () => window.removeEventListener("fid:rate-limited", onRateLimited);
  }, [push, t]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 end-4 z-50 flex max-w-sm flex-col gap-2">
        {toasts.map((toast) => {
          const style = toastStyles[toast.kind];
          return (
            <div key={toast.id} className={`card pointer-events-auto flex items-start gap-2 text-sm shadow-lg ${style.color}`}>
              <span className="material-icons" aria-hidden="true">{style.icon}</span>
              <span className="text-espresso dark:text-[#E8F0FE]">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

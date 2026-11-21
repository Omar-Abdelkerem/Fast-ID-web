import { useEffect, useId, useRef } from "react";
import { useTranslation } from "react-i18next";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}) {
  const { t } = useTranslation("common");
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialogNode = dialogRef.current;
    if (dialogNode) {
      const focusables = dialogNode.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        dialogNode.focus();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        );
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      const previousEl = previousFocusRef.current;
      if (previousEl && typeof previousEl.focus === "function") {
        previousEl.focus();
      }
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full ${sizeClass} max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="font-heading text-lg font-bold text-navy">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("buttons.close")}
            className="rounded-lg p-1.5 text-muted hover:bg-sky hover:text-navy"
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 text-sm text-navy">{children}</div>

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-page/70 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

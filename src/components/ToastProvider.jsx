/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

const ToastContext = createContext(null);
const AUTO_DISMISS_MS = 5000;

const TOAST_STYLES = {
  success: "border-success/40 bg-success-bg text-success-dark",
  error: "border-danger/40 bg-danger-bg text-danger",
  info: "border-info/40 bg-info-bg text-info",
};

export function ToastProvider({ children }) {
  const { t } = useTranslation("common");
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());
  const counterRef = useRef(0);

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback(
    (type, message) => {
      if (!message) return;
      counterRef.current += 1;
      const id = `toast-${counterRef.current}`;

      setToasts((prev) => [...prev, { id, type, message }]);

      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, AUTO_DISMISS_MS);

      timersRef.current.set(id, timer);
    },
    []
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      success: (message) => pushToast("success", message),
      error: (message) => pushToast("error", message),
      info: (message) => pushToast("info", message),
    }),
    [pushToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-relevant="additions text"
        className="pointer-events-none fixed bottom-4 end-4 z-50 flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const isError = toast.type === "error";
          return (
            <div
              key={toast.id}
              role={isError ? "alert" : "status"}
              aria-live={isError ? "assertive" : "polite"}
              className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium shadow-md ${
                TOAST_STYLES[toast.type] || TOAST_STYLES.info
              }`}
            >
              <span className="min-w-0 flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={t("buttons.close")}
                className="shrink-0 rounded p-0.5 opacity-80 hover:opacity-100"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return context;
}

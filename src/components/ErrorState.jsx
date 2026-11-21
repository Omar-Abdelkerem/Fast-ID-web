import { useTranslation } from "react-i18next";
import { getErrorMessage } from "@/lib/errors";

export function ErrorState({ error, onRetry }) {
  const { t } = useTranslation("common");
  const message = getErrorMessage(error, t);

  return (
    <div
      role="alert"
      className="rounded-2xl border border-danger/25 bg-danger-bg p-5 text-start"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-danger text-xs font-bold text-white"
          >
            !
          </span>
          <div>
            <p className="text-sm font-bold text-danger">{t("states.error")}</p>
            <p className="mt-0.5 text-sm text-navy">{message}</p>
          </div>
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="btn-secondary btn-sm shrink-0 self-start sm:self-center"
          >
            {t("buttons.retry")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

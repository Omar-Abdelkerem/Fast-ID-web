import { useTranslation } from "react-i18next";
import { formatDateTime } from "@/lib/format";

// the expected path of an application
const PATH = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "OUT_FOR_DELIVERY", "DELIVERED"];

// statusHistory is oldest first, each entry { status, at, note }
export default function StatusTimeline({ application }) {
  const { t, i18n } = useTranslation("applications");
  const { status, statusHistory } = application;

  // the last time each status was reached
  const reachedAt = {};
  statusHistory.forEach((entry) => {
    reachedAt[entry.status] = entry.at;
  });

  const terminal = status === "REJECTED" || status === "CANCELLED";
  const steps = PATH.map((step) => ({
    key: step,
    state: step === status ? "current" : reachedAt[step] ? "done" : "todo",
    at: reachedAt[step],
  }));
  if (terminal) steps.push({ key: status, state: "terminal", at: reachedAt[status] });

  const stateText = { done: t("timeline.done"), current: t("timeline.current"), todo: t("timeline.todo"), terminal: t("timeline.ended") };
  const stateStyle = {
    done: "bg-terracotta-dark text-white",
    current: "bg-terracotta-dark text-white ring-4 ring-[#4966F0]/30",
    todo: "bg-beige text-muted ring-1 ring-line dark:bg-[#232963] dark:ring-[#2f3670]",
    terminal: "bg-danger text-white",
  };
  const stateIcon = { done: "check", current: "radio_button_checked", todo: "radio_button_unchecked", terminal: status === "CANCELLED" ? "block" : "close" };

  return (
    <ol className="space-y-4" aria-label={t("timeline.title")}>
      {steps.map((step, index) => (
        <li key={step.key} className="flex gap-3" aria-current={step.state === "current" ? "step" : undefined}>
          <div className="flex flex-col items-center">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${stateStyle[step.state]}`}>
              <span className="material-icons" aria-hidden="true">{stateIcon[step.state]}</span>
            </span>
            {index < steps.length - 1 && <span className="mt-1 h-full min-h-[1rem] w-0.5 bg-line dark:bg-[#2f3670]" aria-hidden="true" />}
          </div>
          <div className="pb-2">
            <p className={`font-semibold ${step.state === "todo" ? "text-muted" : ""}`}>
              {t(`steps.${step.key}`)} <span className="text-xs font-normal text-muted">· {stateText[step.state]}</span>
            </p>
            {step.at && <p className="text-xs text-muted">{formatDateTime(step.at, i18n.language)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

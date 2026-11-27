import { useTranslation } from "react-i18next";

const STEPS = [1, 2, 3, 4];

export default function WizardStepper({ currentStep, onStepChange, disabled }) {
  const { t } = useTranslation("apply");

  return (
    <nav aria-label={t("title")} className="mb-6">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((step) => {
          const isCurrent = step === currentStep;
          const isCompleted = step < currentStep;

          return (
            <li key={step}>
              <button
                type="button"
                disabled={disabled}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onStepChange(step)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-start text-sm transition ${
                  isCurrent
                    ? "fid-step-current border-[#4765F4] bg-[#4765F4] text-white font-semibold"
                    : isCompleted
                    ? "border-[#D9E1F4] bg-[#E7EEFC] text-[#252C68] hover:border-[#4765F4]"
                    : "border-[#D9E1F4] bg-white text-[#68769D] hover:border-[#4765F4] hover:text-[#252C68]"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isCurrent
                      ? "bg-white text-[#4765F4]"
                      : isCompleted
                      ? "bg-[#4765F4] text-white"
                      : "bg-[#E7EEFC] text-[#252C68]"
                  }`}
                >
                  {step}
                </span>
                <span className="truncate">{t(`steps.${step}`)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

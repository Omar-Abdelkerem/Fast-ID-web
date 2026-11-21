import { useTranslation } from "react-i18next";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormField, useToast } from "@/components";
import { applyServerErrors, getErrorMessage } from "@/lib/errors";
import { reportFailedAttempt } from "../api";

const REASON_CODES = ["CITIZEN_UNAVAILABLE", "WRONG_ADDRESS", "CITIZEN_REFUSED", "OTHER"];

// reason: required (5 to 300 characters) for OTHER, optional up to 300 otherwise
const schema = z
  .object({ reasonCode: z.enum(["CITIZEN_UNAVAILABLE", "WRONG_ADDRESS", "CITIZEN_REFUSED", "OTHER"]), reason: z.string() })
  .superRefine((values, ctx) => {
    const reason = values.reason.trim();
    if (reason.length > 300) ctx.addIssue({ code: "custom", path: ["reason"], message: "reasonTooLong" });
    if (values.reasonCode === "OTHER" && reason.length < 5) ctx.addIssue({ code: "custom", path: ["reason"], message: "reasonRequired" });
  });

export default function FailForm({ deliveryId, emphasised, onDone }) {
  const { t } = useTranslation("agent");
  const toast = useToast();
  const queryClient = useQueryClient();
  const { register, handleSubmit, setError, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { reasonCode: "CITIZEN_UNAVAILABLE", reason: "" },
  });

  const mutation = useMutation({
    mutationFn: (values) => {
      const reason = values.reason.trim();
      return reportFailedAttempt(deliveryId, reason ? { reasonCode: values.reasonCode, reason } : { reasonCode: values.reasonCode });
    },
    onSuccess: () => {
      toast.success(t("fail.success"));
      queryClient.invalidateQueries({ queryKey: ["agent", "deliveries"] });
      onDone();
    },
    onError: (error) => {
      const mapped = applyServerErrors(error, setError, t, { fieldMap: { "data.reason": "reason" } });
      if (!mapped) toast.error(getErrorMessage(error, t));
      if (error.code === "INVALID_STATUS_TRANSITION") queryClient.invalidateQueries({ queryKey: ["agent", "deliveries"] });
    },
  });

  const isOther = useWatch({ control, name: "reasonCode" }) === "OTHER";
  const reasonError = errors.reason?.message;

  return (
    <form className="card dark:bg-[#1b2048] dark:border-[#2f3670] space-y-3" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
      <h2 className="font-bold">{t("fail.title")}</h2>

      <fieldset>
        <legend className="label dark:text-[#E8F0FE]">{t("fail.reasonCode")}</legend>
        <div className="space-y-2">
          {REASON_CODES.map((code) => (
            <label key={code} className="flex min-h-[44px] items-center gap-3 rounded-xl border border-line dark:border-[#2f3670] px-3 text-sm">
              <input type="radio" value={code} {...register("reasonCode")} />
              {t(`reasons.${code}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <FormField
        label={isOther ? t("fail.reasonRequired") : t("fail.reasonOptional")}
        htmlFor="fail-reason"
        error={reasonError ? (errors.reason.type === "server" ? reasonError : t(`fail.errors.${reasonError}`)) : undefined}
      >
        <textarea id="fail-reason" rows={3} maxLength={300} className="textarea dark:bg-[#0f1226] dark:border-[#3b4380] dark:text-[#E8F0FE]" {...register("reason")} />
      </FormField>

      <button type="submit" className={`btn min-h-[48px] w-full ${emphasised ? "btn-danger dark:bg-transparent dark:text-[#ff8a80] dark:border-[#ff8a80] dark:hover:bg-[#4a1f24] border-4" : "btn-secondary dark:bg-transparent dark:text-[#E8F0FE] dark:border-[#8da0ff] dark:hover:bg-[#232963]"}`} disabled={mutation.isPending}>
        {mutation.isPending ? t("fail.sending") : t("fail.submit")}
      </button>
    </form>
  );
}

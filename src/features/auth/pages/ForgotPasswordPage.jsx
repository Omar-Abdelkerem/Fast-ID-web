import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import AuthCard from "../components/AuthCard";
import { requestPasswordReset } from "../api";

const schema = z.object({ email: z.string().trim().min(1, "required").max(254, "tooLong").email("email") });

export default function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const { errors, isSubmitting } = formState;

  async function onSubmit(values) {
    setFormError("");
    try {
      await requestPasswordReset(values.email.trim());
      setSent(true);
    } catch (error) {
      setFormError(getErrorMessage(error, t));
    }
  }

  const backToLogin = <Link to="/login" className="link">{t("forgot.backToLogin")}</Link>;

  // always the same neutral message: we never say whether the email has an account
  if (sent) {
    return (
      <AuthCard title={t("forgot.title")} footer={backToLogin}>
        <p role="status" className="rounded-xl bg-green-100 p-3 text-sm text-success dark:bg-[#17382c] dark:text-[#7fd1a8]">
          {t("forgot.sent")}
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("forgot.title")} subtitle={t("forgot.subtitle")} footer={backToLogin}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]">{formError}</p>}
        <FormField label={t("forgot.email")} htmlFor="email" error={errors.email ? t(`validation.${errors.email.message}`) : undefined}>
          <input id="email" type="email" dir="ltr" autoComplete="email" className="input text-start" aria-invalid={Boolean(errors.email)} {...register("email")} />
        </FormField>
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? t("forgot.submitting") : t("forgot.submit")}
        </button>
      </form>
    </AuthCard>
  );
}

import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import AuthCard from "../components/AuthCard";
import PasswordInput from "../components/PasswordInput";
import { resetPassword } from "../api";
import { checkPassword } from "../utils";

const schema = z
  .object({ newPassword: z.string(), confirmPassword: z.string() })
  .superRefine((values, ctx) => {
    const problem = checkPassword(values.newPassword);
    if (problem) ctx.addIssue({ code: "custom", path: ["newPassword"], message: problem });
    if (values.confirmPassword !== values.newPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "passwordMismatch" });
  });

export default function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [done, setDone] = useState(false);
  const [errorCode, setErrorCode] = useState("");
  const [formError, setFormError] = useState("");

  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema), defaultValues: { newPassword: "", confirmPassword: "" } });
  const { errors, isSubmitting } = formState;
  const fieldError = (name) => (errors[name] ? t(`validation.${errors[name].message}`) : undefined);

  async function onSubmit(values) {
    setFormError("");
    try {
      await resetPassword(token, values.newPassword);
      setDone(true);
    } catch (error) {
      if (error.code === "INVALID_RESET_TOKEN") setErrorCode(error.code);
      else setFormError(getErrorMessage(error, t));
    }
  }

  // no token in the link, or the server refused it: explain and offer a new link
  if (!token || errorCode) {
    return (
      <AuthCard title={t("reset.title")}>
        <p role="alert" className="mb-4 text-sm">{t(errorCode ? "reset.invalidToken" : "reset.missingToken")}</p>
        <Link to="/forgot-password" className="btn btn-primary w-full">{t("reset.requestNew")}</Link>
      </AuthCard>
    );
  }

  // the user is not logged in automatically: send them to login
  if (done) {
    return (
      <AuthCard title={t("reset.title")}>
        <p role="status" className="mb-4 rounded-xl bg-green-100 p-3 text-sm text-success dark:bg-[#17382c] dark:text-[#7fd1a8]">{t("reset.success")}</p>
        <Link to="/login" className="btn btn-primary w-full">{t("reset.goToLogin")}</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("reset.title")} subtitle={t("reset.subtitle")}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]">{formError}</p>}
        <FormField label={t("reset.newPassword")} htmlFor="newPassword" error={fieldError("newPassword")} hint={t("register.passwordHint")}>
          <PasswordInput id="newPassword" autoComplete="new-password" invalid={Boolean(errors.newPassword)} registration={register("newPassword")} />
        </FormField>
        <FormField label={t("register.confirmPassword")} htmlFor="confirmPassword" error={fieldError("confirmPassword")}>
          <PasswordInput id="confirmPassword" autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} registration={register("confirmPassword")} />
        </FormField>
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? t("reset.submitting") : t("reset.submit")}
        </button>
      </form>
    </AuthCard>
  );
}

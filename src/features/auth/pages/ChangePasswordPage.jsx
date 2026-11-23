import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField, useToast } from "@/components";
import { useAuth, getRoleHome } from "@/lib/auth";
import { applyServerErrors, getErrorMessage } from "@/lib/errors";
import AuthCard from "../components/AuthCard";
import PasswordInput from "../components/PasswordInput";
import { changePassword } from "../api";
import { checkPassword } from "../utils";

const schema = z
  .object({ currentPassword: z.string().min(1, "required").max(128, "tooLong"), newPassword: z.string(), confirmPassword: z.string() })
  .superRefine((values, ctx) => {
    const problem = checkPassword(values.newPassword);
    if (problem) ctx.addIssue({ code: "custom", path: ["newPassword"], message: problem });
    else if (values.newPassword === values.currentPassword) ctx.addIssue({ code: "custom", path: ["newPassword"], message: "passwordSame" });
    if (values.confirmPassword !== values.newPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "passwordMismatch" });
  });

export default function ChangePasswordPage() {
  const { t } = useTranslation("auth");
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState("");

  const { register, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = formState;
  const fieldError = (name) => {
    const error = errors[name];
    if (!error) return undefined;
    return error.type === "server" ? error.message : t(`validation.${error.message}`);
  };

  async function onSubmit(values) {
    setFormError("");
    try {
      await changePassword(values.currentPassword, values.newPassword);
      const fresh = await refreshUser();
      toast.success(t("change.success"));
      navigate(getRoleHome(fresh.role), { replace: true });
    } catch (error) {
      // INVALID_CURRENT_PASSWORD belongs to the current password field, PASSWORD_UNCHANGED to the new one
      const field = error.code === "INVALID_CURRENT_PASSWORD" ? "currentPassword" : error.code === "PASSWORD_UNCHANGED" ? "newPassword" : null;
      if (field) setError(field, { type: "server", message: getErrorMessage(error, t) });
      else if (!applyServerErrors(error, setError, t)) setFormError(getErrorMessage(error, t));
    }
  }

  return (
    <AuthCard title={t("change.title")}>
      {user?.mustChangePassword && (
        <p role="status" className="mb-4 rounded-xl bg-amber-100 p-3 text-sm text-warning dark:bg-[#3d3010] dark:text-[#f0c36a]">
          {t("change.mustChange")}
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]">{formError}</p>}
        <FormField label={t("change.currentPassword")} htmlFor="currentPassword" error={fieldError("currentPassword")}>
          <PasswordInput id="currentPassword" autoComplete="current-password" invalid={Boolean(errors.currentPassword)} registration={register("currentPassword")} />
        </FormField>
        <FormField label={t("change.newPassword")} htmlFor="newPassword" error={fieldError("newPassword")} hint={t("register.passwordHint")}>
          <PasswordInput id="newPassword" autoComplete="new-password" invalid={Boolean(errors.newPassword)} registration={register("newPassword")} />
        </FormField>
        <FormField label={t("register.confirmPassword")} htmlFor="confirmPassword" error={fieldError("confirmPassword")}>
          <PasswordInput id="confirmPassword" autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} registration={register("confirmPassword")} />
        </FormField>
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? t("change.submitting") : t("change.submit")}
        </button>
      </form>
    </AuthCard>
  );
}

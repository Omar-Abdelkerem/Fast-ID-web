import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "@/components";
import { useAuth, resolveRedirect } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import AuthCard from "../components/AuthCard";
import PasswordInput from "../components/PasswordInput";

const schema = z.object({
  identifier: z.string().trim().min(1, "required").max(254, "tooLong"),
  password: z.string().min(1, "required").max(128, "tooLong"),
});

export default function LoginPage() {
  const { t } = useTranslation("auth");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formError, setFormError] = useState("");

  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema), defaultValues: { identifier: "", password: "" } });
  const { errors, isSubmitting } = formState;
  const fieldError = (name) => (errors[name] ? t(`validation.${errors[name].message}`) : undefined);

  async function onSubmit(values) {
    setFormError("");
    try {
      const user = await login(values.identifier, values.password);
      // a forced password change comes first
      if (user.mustChangePassword) return navigate("/change-password", { replace: true });
      navigate(resolveRedirect(searchParams.get("from"), user.role), { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error, t));
    }
  }

  return (
    <AuthCard
      title={t("login.title")}
      subtitle={t("login.subtitle")}
      footer={
        <>
          {t("login.noAccount")} <Link to="/register" className="link">{t("login.register")}</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]">
            {formError}
          </p>
        )}
        <FormField label={t("login.identifier")} htmlFor="identifier" error={fieldError("identifier")} hint={t("login.identifierHint")}>
          <input id="identifier" dir="ltr" autoComplete="username" className="input text-start" aria-invalid={Boolean(errors.identifier)} {...register("identifier")} />
        </FormField>
        <FormField label={t("login.password")} htmlFor="password" error={fieldError("password")}>
          <PasswordInput id="password" autoComplete="current-password" invalid={Boolean(errors.password)} registration={register("password")} />
        </FormField>
        <div className="text-end text-sm">
          <Link to="/forgot-password" className="link">{t("login.forgot")}</Link>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? t("login.submitting") : t("login.submit")}
        </button>
      </form>
    </AuthCard>
  );
}

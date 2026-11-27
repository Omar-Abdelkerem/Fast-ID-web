import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField, useToast } from "@/components";
import { useAuth, getRoleHome } from "@/lib/auth";
import { applyServerErrors, getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import AuthCard from "../components/AuthCard";
import PasswordInput from "../components/PasswordInput";
import { checkPassword, isValidFullName, normalizePhone, phoneRegex, validateNationalId } from "../utils";

// confirmPassword exists only in the form and is never sent
const schema = z
  .object({
    fullName: z.string().trim().refine(isValidFullName, "fullName"),
    nationalId: z.string().trim().refine((value) => validateNationalId(value).valid, "nationalId"),
    email: z.string().trim().min(1, "required").max(254, "tooLong").email("email"),
    phone: z.string().trim().regex(phoneRegex, "phone"),
    password: z.string(),
    confirmPassword: z.string(),
    preferredLanguage: z.enum(["ar", "en"]),
    acceptTerms: z.boolean().refine((value) => value === true, "acceptTerms"),
  })
  .superRefine((values, ctx) => {
    const problem = checkPassword(values.password, values.email, values.nationalId);
    if (problem) ctx.addIssue({ code: "custom", path: ["password"], message: problem });
    if (values.confirmPassword !== values.password) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "passwordMismatch" });
  });

export default function RegisterPage() {
  const { t, i18n } = useTranslation("auth");
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState("");

  const { register, control, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", nationalId: "", email: "", phone: "", password: "", confirmPassword: "", preferredLanguage: i18n.language === "en" ? "en" : "ar", acceptTerms: false },
  });
  const { errors, isSubmitting } = formState;
  const fieldError = (name) => {
    const error = errors[name];
    if (!error) return undefined;
    return error.type === "server" ? error.message : t(`validation.${error.message}`);
  };

  // P1: preview of the birth date and gender the server will derive from the national ID
  const nationalId = useWatch({ control, name: "nationalId" });
  const derived = validateNationalId((nationalId || "").trim());

  async function onSubmit(values) {
    setFormError("");
    // send only the fields the contract lists
    const payload = {
      fullName: values.fullName.trim().replace(/\s+/g, " "),
      nationalId: values.nationalId.trim(),
      email: values.email.trim(),
      phone: normalizePhone(values.phone),
      password: values.password,
      preferredLanguage: values.preferredLanguage,
      acceptTerms: values.acceptTerms,
    };
    try {
      const user = await registerUser(payload);
      toast.success(t("register.success"));
      navigate(getRoleHome(user.role), { replace: true });
    } catch (error) {
      const shown = applyServerErrors(error, setError, t);
      if (!shown) setFormError(getErrorMessage(error, t));
      else if (error.code !== "VALIDATION_ERROR") setFormError(getErrorMessage(error, t));
    }
  }

  return (
    <AuthCard
      title={t("register.title")}
      subtitle={t("register.subtitle")}
      footer={
        <>
          {t("register.haveAccount")} <Link to="/login" className="link">{t("register.login")}</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {formError && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]">
            {formError}
          </p>
        )}
        <FormField label={t("register.fullName")} htmlFor="fullName" error={fieldError("fullName")} hint={t("register.fullNameHint")} required>
          <input id="fullName" autoComplete="name" className="input" aria-invalid={Boolean(errors.fullName)} {...register("fullName")} />
        </FormField>
        <FormField label={t("register.nationalId")} htmlFor="nationalId" error={fieldError("nationalId")} hint={t("register.nationalIdHint")} required>
          <input id="nationalId" dir="ltr" inputMode="numeric" maxLength={14} className="input text-start" aria-invalid={Boolean(errors.nationalId)} {...register("nationalId")} />
        </FormField>
        {derived.valid && (
          <p className="rounded-xl bg-beige p-2 text-xs dark:bg-[#232963]">
            {t("register.derived", { birthDate: formatDate(derived.birthDate, i18n.language), gender: t(`gender.${derived.gender}`) })}
          </p>
        )}
        <FormField label={t("register.email")} htmlFor="email" error={fieldError("email")} required>
          <input id="email" type="email" dir="ltr" autoComplete="email" className="input text-start" aria-invalid={Boolean(errors.email)} {...register("email")} />
        </FormField>
        <FormField label={t("register.phone")} htmlFor="phone" error={fieldError("phone")} hint={t("register.phoneHint")} required>
          <input id="phone" type="tel" dir="ltr" autoComplete="tel" className="input text-start" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
        </FormField>
        <FormField label={t("register.password")} htmlFor="password" error={fieldError("password")} hint={t("register.passwordHint")} required>
          <PasswordInput id="password" autoComplete="new-password" invalid={Boolean(errors.password)} registration={register("password")} />
        </FormField>
        <FormField label={t("register.confirmPassword")} htmlFor="confirmPassword" error={fieldError("confirmPassword")} required>
          <PasswordInput id="confirmPassword" autoComplete="new-password" invalid={Boolean(errors.confirmPassword)} registration={register("confirmPassword")} />
        </FormField>
        <FormField label={t("register.language")} htmlFor="preferredLanguage">
          <select id="preferredLanguage" className="select" {...register("preferredLanguage")}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </FormField>
        <div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" aria-invalid={Boolean(errors.acceptTerms)} {...register("acceptTerms")} />
            {t("register.acceptTerms")}
          </label>
          {fieldError("acceptTerms") && <p className="field-error" role="alert">{fieldError("acceptTerms")}</p>}
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? t("register.submitting") : t("register.submit")}
        </button>
      </form>
    </AuthCard>
  );
}

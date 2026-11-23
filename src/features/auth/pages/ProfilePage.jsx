import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { FormField, PageHeader, Spinner, useToast } from "@/components";
import { useAuth } from "@/lib/auth";
import { applyServerErrors, getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { updateProfile } from "../api";
import { normalizePhone, phoneRegex } from "../utils";

const schema = z.object({ phone: z.string().trim().regex(phoneRegex, "phone"), preferredLanguage: z.enum(["ar", "en"]) });

export default function ProfilePage() {
  const { t, i18n } = useTranslation("auth");
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  if (!user) return <Spinner />;
  return <ProfileForm user={user} refreshUser={refreshUser} toast={toast} t={t} i18n={i18n} />;
}

function ProfileForm({ user, refreshUser, toast, t, i18n }) {
  const { register, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { phone: user.phone, preferredLanguage: user.preferredLanguage },
  });
  const { errors } = formState;

  const saveMutation = useMutation({
    mutationFn: (changes) => updateProfile(changes),
    onSuccess: async (updated, changes) => {
      await refreshUser();
      // changing the language also switches the interface right away
      if (changes.preferredLanguage) {
        localStorage.setItem("lang", changes.preferredLanguage);
        i18n.changeLanguage(changes.preferredLanguage);
      }
      toast.success(t("profile.saved"));
    },
    onError: (error) => {
      if (!applyServerErrors(error, setError, t)) toast.error(getErrorMessage(error, t));
    },
  });

  function onSubmit(values) {
    // send only the changed fields; at least one is required
    const changes = {};
    const phone = normalizePhone(values.phone);
    if (phone !== user.phone) changes.phone = phone;
    if (values.preferredLanguage !== user.preferredLanguage) changes.preferredLanguage = values.preferredLanguage;
    if (Object.keys(changes).length === 0) return toast.info(t("profile.noChanges"));
    saveMutation.mutate(changes);
  }

  const readOnly = [
    ["profile.fullName", user.fullName],
    ["profile.email", user.email],
    ["profile.role", t(`roles.${user.role}`, { ns: "common" })],
  ];
  if (user.role === "CITIZEN") {
    readOnly.push(["profile.nationalId", user.nationalId], ["profile.birthDate", formatDate(user.birthDate, i18n.language)], ["profile.gender", t(`gender.${user.gender}`)]);
  }
  if (user.role === "AGENT") readOnly.push(["profile.governorate", user.governorate]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")} />

      <section className="card mb-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {readOnly.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{t(label)}</dt>
              <dd className="font-semibold" dir="auto">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-4">
        <h2 className="font-bold">{t("profile.editable")}</h2>
        <FormField label={t("profile.phone")} htmlFor="phone" error={errors.phone ? (errors.phone.type === "server" ? errors.phone.message : t(`validation.${errors.phone.message}`)) : undefined}>
          <input id="phone" type="tel" dir="ltr" autoComplete="tel" className="input text-start" {...register("phone")} />
        </FormField>
        <FormField label={t("profile.language")} htmlFor="preferredLanguage">
          <select id="preferredLanguage" className="select" {...register("preferredLanguage")}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </FormField>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? t("profile.saving") : t("profile.save")}
          </button>
          <Link to="/change-password" className="link text-sm">{t("profile.changePassword")}</Link>
        </div>
      </form>
    </div>
  );
}

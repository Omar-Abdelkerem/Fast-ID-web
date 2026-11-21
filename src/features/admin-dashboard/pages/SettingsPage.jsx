import { useTranslation } from "react-i18next";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorState, FormField, PageHeader, Spinner, useToast } from "@/components";
import { applyServerErrors, getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { getSettings, updateSettings } from "../api";

const phoneRegex = /^(?:\+20|20|0)1[0125][0-9]{8}$/;

// the announcement is both languages or none; the switch "No announcement" sends null
const schema = z
  .object({
    supportEmail: z.string().trim(),
    supportPhone: z.string().trim(),
    noAnnouncement: z.boolean(),
    announcementAr: z.string(),
    announcementEn: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.supportEmail && (values.supportEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.supportEmail))) ctx.addIssue({ code: "custom", path: ["supportEmail"], message: "email" });
    if (values.supportPhone && !phoneRegex.test(values.supportPhone)) ctx.addIssue({ code: "custom", path: ["supportPhone"], message: "phone" });
    if (!values.noAnnouncement) {
      ["Ar", "En"].forEach((lang) => {
        const text = values[`announcement${lang}`].trim();
        if (text.length < 1) ctx.addIssue({ code: "custom", path: [`announcement${lang}`], message: "announcementRequired" });
        else if (text.length > 300) ctx.addIssue({ code: "custom", path: [`announcement${lang}`], message: "announcementLength" });
      });
    }
  });

export default function SettingsPage() {
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  if (settingsQuery.isLoading) return <Spinner />;
  if (settingsQuery.isError) return <ErrorState error={settingsQuery.error} onRetry={settingsQuery.refetch} />;
  // the form starts from the saved settings; key = the save time, so it resets after every save
  return <SettingsForm key={settingsQuery.data.updatedAt} settings={settingsQuery.data} />;
}

function SettingsForm({ settings }) {
  const { t, i18n } = useTranslation("admin-dashboard");
  const toast = useToast();
  const queryClient = useQueryClient();

  const { register, control, handleSubmit, setError, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      supportEmail: settings.supportEmail || "",
      supportPhone: settings.supportPhone || "",
      noAnnouncement: settings.announcement === null,
      announcementAr: settings.announcement?.ar || "",
      announcementEn: settings.announcement?.en || "",
    },
  });
  const { errors } = formState;
  const fieldError = (name) => {
    const error = errors[name];
    if (!error) return undefined;
    return error.type === "server" ? error.message : t(`validation.${error.message}`);
  };

  const values = useWatch({ control });
  const previewText = values.noAnnouncement ? "" : (i18n.language === "en" ? values.announcementEn : values.announcementAr) || "";

  const saveMutation = useMutation({
    mutationFn: (changes) => updateSettings(changes),
    onSuccess: () => {
      toast.success(t("settings.saved"));
      // the public banner reads the same query
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error) => {
      const fieldMap = { "announcement.ar": "announcementAr", "announcement.en": "announcementEn" };
      if (!applyServerErrors(error, setError, t, { fieldMap })) toast.error(getErrorMessage(error, t));
    },
  });

  function onSubmit(form) {
    // only the changed fields; an empty email or phone is sent as null
    const changes = {};
    const email = form.supportEmail || null;
    const phone = form.supportPhone ? form.supportPhone.replace(/^\+?20/, "0") : null;
    if (email !== settings.supportEmail) changes.supportEmail = email;
    if (phone !== settings.supportPhone) changes.supportPhone = phone;
    const announcement = form.noAnnouncement ? null : { ar: form.announcementAr.trim(), en: form.announcementEn.trim() };
    if (JSON.stringify(announcement) !== JSON.stringify(settings.announcement)) changes.announcement = announcement;
    if (Object.keys(changes).length === 0) return toast.info(t("settings.noChanges"));
    saveMutation.mutate(changes);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />
      <p className="mb-3 text-xs text-muted">{t("settings.updatedAt")}: {formatDateTime(settings.updatedAt, i18n.language)}</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-4">
        <FormField label={t("settings.supportEmail")} htmlFor="supportEmail" error={fieldError("supportEmail")} hint={t("settings.emptyHint")}>
          <input id="supportEmail" type="email" dir="ltr" className="input text-start" {...register("supportEmail")} />
        </FormField>
        <FormField label={t("settings.supportPhone")} htmlFor="supportPhone" error={fieldError("supportPhone")} hint={t("settings.emptyHint")}>
          <input id="supportPhone" type="tel" dir="ltr" className="input text-start" {...register("supportPhone")} />
        </FormField>

        <fieldset className="space-y-3">
          <legend className="label">{t("settings.announcement")}</legend>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" {...register("noAnnouncement")} />
            {t("settings.noAnnouncement")}
          </label>
          {!values.noAnnouncement && (
            <>
              <p className="text-xs text-muted">{t("settings.bothLanguages")}</p>
              <FormField label={`${t("settings.announcement")} (${t("settings.arabic")})`} htmlFor="announcementAr" error={fieldError("announcementAr")}>
                <textarea id="announcementAr" dir="rtl" rows={2} maxLength={400} className="textarea" {...register("announcementAr")} />
              </FormField>
              <FormField label={`${t("settings.announcement")} (${t("settings.english")})`} htmlFor="announcementEn" error={fieldError("announcementEn")}>
                <textarea id="announcementEn" dir="ltr" rows={2} maxLength={400} className="textarea" {...register("announcementEn")} />
              </FormField>
            </>
          )}
        </fieldset>

        <div aria-live="polite">
          <p className="label">{t("settings.preview")}</p>
          {previewText ? (
            <div role="status" className="flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-warning dark:bg-[#3d3010] dark:text-[#f0c36a]">
              <span className="material-icons" aria-hidden="true">campaign</span>
              <span>{previewText}</span>
            </div>
          ) : (
            <p className="text-sm text-muted">{t("settings.noPreview")}</p>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? t("settings.saving") : t("settings.save")}
        </button>
      </form>
    </div>
  );
}

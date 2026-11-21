import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components";
import { CATEGORIES } from "../schema";
import LocalizedInputs, { useErrorText } from "./LocalizedInputs";

export default function BasicsSection({ isNew }) {
  const { t } = useTranslation("admin-services");
  const { register, watch } = useFormContext();
  const errorText = useErrorText();
  const neverExpires = watch("neverExpires");

  return (
    <section className="card dark:bg-[#1b2048] dark:border-[#2f3670] space-y-4" aria-labelledby="basics-title">
      <h2 id="basics-title" className="font-bold text-lg">{t("editor.basics")}</h2>

      <FormField label={t("editor.id")} htmlFor="service-id" error={errorText("id")} hint={isNew ? t("editor.idHint") : t("editor.idLocked")}>
        <input id="service-id" dir="ltr" className="input dark:bg-[#0f1226] dark:border-[#3b4380] dark:text-[#E8F0FE] font-mono" readOnly={!isNew} {...register("id")} />
      </FormField>

      <LocalizedInputs name="name" label={t("editor.name")} />
      <LocalizedInputs name="description" label={t("editor.description")} multiline />

      <div className="grid gap-3 md:grid-cols-2">
        <FormField label={t("editor.category")} htmlFor="service-category" error={errorText("category")}>
          <select id="service-category" className="select dark:bg-[#0f1226] dark:border-[#3b4380] dark:text-[#E8F0FE]" {...register("category")}>
            {CATEGORIES.map((category) => <option key={category} value={category}>{t(`category.${category}`)}</option>)}
          </select>
        </FormField>

        <FormField label={t("editor.fee")} htmlFor="service-fee" error={errorText("feeEgp")} hint={t("editor.feeHint")}>
          <input id="service-fee" dir="ltr" inputMode="decimal" className="input dark:bg-[#0f1226] dark:border-[#3b4380] dark:text-[#E8F0FE]" {...register("feeEgp")} />
        </FormField>

        <FormField label={t("editor.slaDays")} htmlFor="service-sla" error={errorText("slaDays")}>
          <input id="service-sla" dir="ltr" inputMode="numeric" className="input dark:bg-[#0f1226] dark:border-[#3b4380] dark:text-[#E8F0FE]" {...register("slaDays")} />
        </FormField>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" {...register("neverExpires")} />
            {t("editor.neverExpires")}
          </label>
          {!neverExpires && (
            <FormField label={t("editor.validityYears")} htmlFor="service-validity" error={errorText("validityYears")}>
              <input id="service-validity" dir="ltr" inputMode="numeric" className="input dark:bg-[#0f1226] dark:border-[#3b4380] dark:text-[#E8F0FE]" {...register("validityYears")} />
            </FormField>
          )}
        </div>
      </div>
    </section>
  );
}

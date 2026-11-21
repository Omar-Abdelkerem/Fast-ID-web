import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components";
import { MIME_TYPES, newDoc } from "../schema";
import LocalizedInputs, { useErrorText, getError } from "./LocalizedInputs";
import Icon from "./Icon";

const MAX_DOCS = 10;

// badRows: indexes the server complained about
export default function RequiredDocumentsSection({ badRows }) {
  const { t } = useTranslation("admin-services");
  const { register, control, formState } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "requiredDocuments" });
  const errorText = useErrorText();

  return (
    <section className="card space-y-4" aria-labelledby="docs-title">
      <div className="flex items-center justify-between">
        <h2 id="docs-title" className="font-bold text-lg">{t("editor.documents")} ({fields.length}/{MAX_DOCS})</h2>
        <button type="button" className="btn btn-secondary btn-sm" disabled={fields.length >= MAX_DOCS} onClick={() => append(newDoc())}>
          {t("editor.addDocument")}
        </button>
      </div>

      {fields.length === 0 && <p className="text-sm text-muted">{t("editor.noDocuments")}</p>}

      {fields.map((row, index) => {
        const hasError = badRows.has(index) || Boolean(getError(formState.errors, `requiredDocuments.${index}`));
        return (
          <div key={row.id} className={`rounded-xl border p-3 space-y-3 ${hasError ? "border-danger border-2" : "border-line"}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{t("editor.documentN", { n: index + 1 })}{hasError && <span className="text-danger"> <Icon name="warning" /> {t("editor.hasProblem")}</span>}</span>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(index)}>{t("editor.remove")}</button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label={t("editor.key")} htmlFor={`doc-${index}-key`} error={errorText(`requiredDocuments.${index}.key`)} hint={t("editor.keyHint")}>
                <input id={`doc-${index}-key`} dir="ltr" className="input font-mono" {...register(`requiredDocuments.${index}.key`)} />
              </FormField>
              <FormField label={t("editor.maxSizeMb")} htmlFor={`doc-${index}-size`} error={errorText(`requiredDocuments.${index}.maxSizeMb`)}>
                <input id={`doc-${index}-size`} dir="ltr" inputMode="decimal" className="input" {...register(`requiredDocuments.${index}.maxSizeMb`)} />
              </FormField>
            </div>

            <LocalizedInputs name={`requiredDocuments.${index}.label`} label={t("editor.label")} idPrefix={`doc-${index}-label`} />

            <fieldset>
              <legend className="label">{t("editor.mimeTypes")}</legend>
              <div className="flex flex-wrap gap-4">
                {MIME_TYPES.map((mime) => (
                  <label key={mime} className="flex items-center gap-2 text-sm" dir="ltr">
                    <input type="checkbox" value={mime} {...register(`requiredDocuments.${index}.allowedMimeTypes`)} />
                    {mime}
                  </label>
                ))}
              </div>
              {errorText(`requiredDocuments.${index}.allowedMimeTypes`) && <p className="field-error">{errorText(`requiredDocuments.${index}.allowedMimeTypes`)}</p>}
            </fieldset>

            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" {...register(`requiredDocuments.${index}.required`)} />
              {t("editor.required")}
            </label>
          </div>
        );
      })}
    </section>
  );
}

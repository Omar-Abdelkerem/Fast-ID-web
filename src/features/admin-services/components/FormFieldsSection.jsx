import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components";
import { FIELD_TYPES, newField } from "../schema";
import LocalizedInputs, { useErrorText, getError } from "./LocalizedInputs";

const MAX_FIELDS = 30;

// the validation inputs each type shows (the other keys are cleared when the type changes)
const validationInputs = {
  TEXT: ["minLength", "maxLength", "pattern"],
  TEXTAREA: ["minLength", "maxLength"],
  NUMBER: ["min", "max"],
  DATE: ["minDate", "maxDate"],
  SELECT: [],
  CHECKBOX: [],
};
const allValidationKeys = ["minLength", "maxLength", "min", "max", "minDate", "maxDate", "pattern"];

function OptionsEditor({ index }) {
  const { t } = useTranslation("admin-services");
  const { register, control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: `fields.${index}.options` });
  const errorText = useErrorText();
  const listError = errorText(`fields.${index}.options`);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="label mb-0">{t("editor.options")} ({fields.length})</span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={fields.length >= 50} onClick={() => append({ value: "", label: { ar: "", en: "" } })}>
          {t("editor.addOption")}
        </button>
      </div>
      {listError && <p className="field-error">{listError}</p>}
      {fields.map((option, optionIndex) => (
        <div key={option.id} className="rounded-lg bg-cream p-2 space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <FormField label={t("editor.optionValue")} htmlFor={`f-${index}-o-${optionIndex}-value`} error={errorText(`fields.${index}.options.${optionIndex}.value`)}>
                <input id={`f-${index}-o-${optionIndex}-value`} dir="ltr" className="input font-mono" {...register(`fields.${index}.options.${optionIndex}.value`)} />
              </FormField>
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(optionIndex)}>{t("editor.remove")}</button>
          </div>
          <LocalizedInputs name={`fields.${index}.options.${optionIndex}.label`} label={t("editor.label")} idPrefix={`f-${index}-o-${optionIndex}-label`} />
        </div>
      ))}
    </div>
  );
}

function FieldRow({ index, total, hasServerError, onMove, onRemove }) {
  const { t } = useTranslation("admin-services");
  const { register, watch, setValue, formState } = useFormContext();
  const errorText = useErrorText();
  const type = watch(`fields.${index}.type`);
  const hasError = hasServerError || Boolean(getError(formState.errors, `fields.${index}`));

  // when the type changes, clear validation keys that no longer apply
  const typeRegister = register(`fields.${index}.type`);
  const onTypeChange = (event) => {
    typeRegister.onChange(event);
    const nextType = event.target.value;
    allValidationKeys.forEach((key) => {
      if (!validationInputs[nextType].includes(key)) setValue(`fields.${index}.${key}`, "");
    });
  };

  const input = (key, label, extra = {}) => (
    <FormField key={key} label={label} htmlFor={`f-${index}-${key}`} error={errorText(`fields.${index}.${key}`)}>
      <input id={`f-${index}-${key}`} dir="ltr" className="input" {...extra} {...register(`fields.${index}.${key}`)} />
    </FormField>
  );

  return (
    <div className={`rounded-xl border p-3 space-y-3 ${hasError ? "border-danger border-2" : "border-line"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-sm">{t("editor.fieldN", { n: index + 1 })}{hasError && ` ⚠ ${t("editor.hasProblem")}`}</span>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary btn-sm" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={t("editor.moveUp")}>↑</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={index === total - 1} onClick={() => onMove(index, index + 1)} aria-label={t("editor.moveDown")}>↓</button>
          <button type="button" className="btn btn-danger btn-sm" onClick={() => onRemove(index)}>{t("editor.remove")}</button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <FormField label={t("editor.key")} htmlFor={`f-${index}-key`} error={errorText(`fields.${index}.key`)} hint={t("editor.fieldKeyHint")}>
          <input id={`f-${index}-key`} dir="ltr" className="input font-mono" {...register(`fields.${index}.key`)} />
        </FormField>
        <FormField label={t("editor.type")} htmlFor={`f-${index}-type`}>
          <select id={`f-${index}-type`} className="select" {...typeRegister} onChange={onTypeChange}>
            {FIELD_TYPES.map((fieldType) => <option key={fieldType} value={fieldType}>{t(`fieldType.${fieldType}`)}</option>)}
          </select>
        </FormField>
      </div>

      <LocalizedInputs name={`fields.${index}.label`} label={t("editor.label")} idPrefix={`f-${index}-label`} />
      <LocalizedInputs name={`fields.${index}.helpText`} label={t("editor.helpText")} idPrefix={`f-${index}-help`} />

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" {...register(`fields.${index}.required`)} />
        {t("editor.required")}
      </label>

      {type === "SELECT" && <OptionsEditor index={index} />}

      {validationInputs[type].length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {validationInputs[type].map((key) => {
            if (key === "pattern") return input(key, t("editor.validation.pattern"));
            if (key === "minDate" || key === "maxDate") return input(key, t(`editor.validation.${key}`), { placeholder: "YYYY-MM-DD" });
            return input(key, t(`editor.validation.${key}`), { inputMode: "numeric" });
          })}
        </div>
      )}
    </div>
  );
}

// badRows: indexes the server complained about
export default function FormFieldsSection({ badRows }) {
  const { t } = useTranslation("admin-services");
  const { control } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({ control, name: "fields" });

  return (
    <section className="card space-y-4" aria-labelledby="fields-title">
      <div className="flex items-center justify-between">
        <h2 id="fields-title" className="font-bold text-lg">{t("editor.formFields")} ({fields.length}/{MAX_FIELDS})</h2>
        <button type="button" className="btn btn-secondary btn-sm" disabled={fields.length >= MAX_FIELDS} onClick={() => append(newField())}>
          {t("editor.addField")}
        </button>
      </div>

      {fields.length === 0 && <p className="text-sm text-muted">{t("editor.noFields")}</p>}

      {fields.map((row, index) => (
        <FieldRow key={row.id} index={index} total={fields.length} hasServerError={badRows.has(index)} onMove={move} onRemove={remove} />
      ))}
    </section>
  );
}

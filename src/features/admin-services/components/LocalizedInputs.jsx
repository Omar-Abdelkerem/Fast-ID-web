import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormField } from "@/components";

// Walks "a.b.c" into the react-hook-form errors object
export function getError(errors, path) {
  return path.split(".").reduce((node, key) => (node ? node[key] : undefined), errors);
}

// Shows the translated message of a field error
export function useErrorText() {
  const { t } = useTranslation("admin-services");
  const { formState } = useFormContext();
  return (path) => {
    const error = getError(formState.errors, path);
    if (!error?.message) return undefined;
    // server errors are already translated, client ones are keys under "validation."
    return error.type === "server" ? error.message : t(`validation.${error.message}`);
  };
}

// An Arabic + English pair of inputs for one localized value, e.g. name.ar / name.en
export default function LocalizedInputs({ name, label, multiline = false, idPrefix }) {
  const { register } = useFormContext();
  const { t } = useTranslation("admin-services");
  const errorText = useErrorText();
  const Tag = multiline ? "textarea" : "input";
  const id = idPrefix || name.replace(/\./g, "-");

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {["ar", "en"].map((lang) => (
        <FormField key={lang} label={`${label} (${t(`lang.${lang}`)})`} htmlFor={`${id}-${lang}`} error={errorText(`${name}.${lang}`)}>
          <Tag
            id={`${id}-${lang}`}
            dir={lang === "ar" ? "rtl" : "ltr"}
            className={multiline ? "textarea" : "input"}
            rows={multiline ? 3 : undefined}
            aria-invalid={Boolean(errorText(`${name}.${lang}`))}
            {...register(`${name}.${lang}`)}
          />
        </FormField>
      ))}
    </div>
  );
}

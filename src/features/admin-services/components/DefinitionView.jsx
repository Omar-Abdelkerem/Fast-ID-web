import { useTranslation } from "react-i18next";
import { useLocalized } from "@/components";
import { formatMoney } from "@/lib/format";

// Read-only list of form fields, the way the citizen will see them (used for the preview)
export function FieldsPreview({ fields }) {
  const { t } = useTranslation("admin-services");
  const { localize } = useLocalized();

  if (fields.length === 0) return <p className="text-sm text-muted dark:text-[#A9B0D6]">{t("editor.noFields")}</p>;
  return (
    <ul className="space-y-2">
      {fields.map((field) => (
        <li key={field.key} className="rounded-lg bg-cream dark:bg-[#232963] p-2 text-sm">
          <div className="font-semibold">
            {localize(field.label)}
            {field.required && <span className="text-danger dark:text-[#ff8a80]" title={t("editor.required")}> *</span>}
            <span className="text-muted dark:text-[#A9B0D6] font-normal"> · {t(`fieldType.${field.type}`)}</span>
          </div>
          {field.helpText && <div className="text-xs text-muted dark:text-[#A9B0D6]">{localize(field.helpText)}</div>}
          {field.options && (
            <ul className="mt-1 list-disc ps-5 text-xs">
              {field.options.map((option) => <li key={option.value}>{localize(option.label)}</li>)}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

// Read-only layout of a whole frozen service definition (used for the versions drawer)
export default function DefinitionView({ definition }) {
  const { t, i18n } = useTranslation("admin-services");
  const { localize } = useLocalized();

  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="font-bold text-base">{localize(definition.name)}</div>
        <p className="text-muted dark:text-[#A9B0D6]">{localize(definition.description)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <dt className="text-muted dark:text-[#A9B0D6]">{t("editor.category")}</dt><dd>{t(`category.${definition.category}`)}</dd>
        <dt className="text-muted dark:text-[#A9B0D6]">{t("editor.fee")}</dt><dd>{formatMoney(definition.fee, i18n.language)}</dd>
        <dt className="text-muted dark:text-[#A9B0D6]">{t("editor.slaDays")}</dt><dd>{definition.slaDays}</dd>
        <dt className="text-muted dark:text-[#A9B0D6]">{t("editor.validityYears")}</dt><dd>{definition.validityYears === null ? t("editor.neverExpires") : definition.validityYears}</dd>
      </dl>
      <div>
        <h3 className="font-semibold mb-1">{t("editor.documents")}</h3>
        {definition.requiredDocuments.length === 0 ? <p className="text-muted dark:text-[#A9B0D6]">{t("editor.noDocuments")}</p> : (
          <ul className="list-disc ps-5">
            {definition.requiredDocuments.map((doc) => (
              <li key={doc.key}>{localize(doc.label)} · {doc.allowedMimeTypes.join(", ")} · {Math.round((doc.maxSizeBytes / 1048576) * 100) / 100} MB{doc.required ? " *" : ""}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-1">{t("editor.formFields")}</h3>
        <FieldsPreview fields={definition.formSchema.fields} />
      </div>
    </div>
  );
}

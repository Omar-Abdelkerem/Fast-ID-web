import { useTranslation } from "react-i18next";
import { useLocalized } from "@/components";
import { formatDate } from "@/lib/format";

// The submitted answers with labels from the service definition, matched by field key.
// If the service or a key can no longer be found, the raw key and value are shown (it must never crash).
export default function AnswersTable({ data, service }) {
  const { t, i18n } = useTranslation("applications");
  const { localize } = useLocalized();
  const entries = Object.entries(data || {});

  function formatValue(field, value) {
    if (!field) return String(value);
    if (field.type === "CHECKBOX") return value ? t("answers.yes") : t("answers.no");
    if (field.type === "DATE") return formatDate(value, i18n.language);
    if (field.type === "SELECT") {
      const option = (field.options || []).find((o) => o.value === value);
      return option ? localize(option.label) : String(value);
    }
    return String(value); // TEXT, TEXTAREA and NUMBER show as they are
  }

  if (entries.length === 0) return <p className="text-sm text-muted">{t("answers.none")}</p>;

  return (
    <dl className="divide-y divide-line dark:divide-[#2f3670]">
      {entries.map(([key, value]) => {
        const field = service?.formSchema?.fields?.find((f) => f.key === key);
        return (
          <div key={key} className="grid gap-1 py-2 sm:grid-cols-3">
            <dt className="text-sm text-muted">{field ? localize(field.label) : key}</dt>
            <dd className="font-semibold sm:col-span-2" dir="auto">{formatValue(field, value)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

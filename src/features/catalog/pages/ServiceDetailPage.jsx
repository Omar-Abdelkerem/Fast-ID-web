import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, Spinner, useLocalized } from "@/components";
import { useAuth } from "@/lib/auth";
import { getService } from "../api";
import { useFeeText } from "../components/ServiceCard";

const mb = (bytes) => Math.round((bytes / 1048576) * 100) / 100;

export default function ServiceDetailPage() {
  const { serviceId } = useParams();
  const { t } = useTranslation("catalog");
  const { localize } = useLocalized();
  const { user } = useAuth();
  const feeText = useFeeText();

  const serviceQuery = useQuery({ queryKey: ["services", serviceId], queryFn: () => getService(serviceId), staleTime: 60 * 1000 });

  if (serviceQuery.isLoading) return <Spinner />;
  if (serviceQuery.isError) {
    if (serviceQuery.error.code === "SERVICE_NOT_FOUND") {
      return (
        <EmptyState
          title={t("detail.notFoundTitle")}
          text={t("detail.notFoundText")}
          action={<Link to="/services" className="btn btn-primary">{t("detail.backToCatalog")}</Link>}
        />
      );
    }
    return <ErrorState error={serviceQuery.error} onRetry={serviceQuery.refetch} />;
  }

  const service = serviceQuery.data;

  // not signed in: login first and come back. Citizens apply. Admins and agents see no button.
  let applyButton = null;
  if (!user) {
    applyButton = <Link to={`/login?from=${encodeURIComponent(`/apply/${service.id}`)}`} className="btn btn-primary">{t("detail.apply")}</Link>;
  } else if (user.role === "CITIZEN") {
    applyButton = <Link to={`/apply/${service.id}`} className="btn btn-primary">{t("detail.apply")}</Link>;
  }

  return (
    <div className="space-y-6">
      <Link to="/services" className="link text-sm">{t("detail.backToCatalog")}</Link>

      <header className="card">
        <span className="badge mb-2 bg-beige text-espresso dark:bg-[#232963] dark:text-[#E8F0FE]">{t(`category.${service.category}`)}</span>
        <h1 className="page-title">{localize(service.name)}</h1>
        <p className="mt-2 text-muted">{localize(service.description)}</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">{t("detail.fee")}</dt>
            <dd className="font-bold">{feeText(service.fee)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("detail.sla")}</dt>
            <dd className="font-bold">{t("service.decisionWithin", { count: service.slaDays })}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("detail.validity")}</dt>
            <dd className="font-bold">{service.validityYears === null ? t("detail.noExpiry") : t("detail.years", { count: service.validityYears })}</dd>
          </div>
        </dl>
        {applyButton && <div className="mt-5">{applyButton}</div>}
      </header>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">{t("detail.documents")}</h2>
        {service.requiredDocuments.length === 0 ? (
          <p className="text-sm text-muted">{t("detail.noDocuments")}</p>
        ) : (
          <ul className="divide-y divide-line dark:divide-[#2f3670]">
            {service.requiredDocuments.map((doc) => (
              <li key={doc.key} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-semibold">{localize(doc.label)}</span>
                <span className="text-muted">
                  {doc.required ? t("detail.required") : t("detail.optional")} · {doc.allowedMimeTypes.map((type) => type.split("/")[1].toUpperCase()).join(", ")} · {t("detail.maxSize", { size: mb(doc.maxSizeBytes) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">{t("detail.questions")}</h2>
        {service.formSchema.fields.length === 0 ? (
          <p className="text-sm text-muted">{t("detail.noQuestions")}</p>
        ) : (
          <ul className="list-disc space-y-1 ps-5 text-sm">
            {service.formSchema.fields.map((field) => (
              <li key={field.key}>{localize(field.label)}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

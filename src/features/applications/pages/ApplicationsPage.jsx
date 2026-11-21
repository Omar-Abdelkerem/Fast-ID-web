import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner, StatusBadge, useLocalized } from "@/components";
import { formatDate } from "@/lib/format";
import { getApplications, getServices } from "../api";

const STATUSES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const SORTS = ["-createdAt", "createdAt", "-updatedAt", "updatedAt"];

export default function ApplicationsPage() {
  const { t, i18n } = useTranslation("applications");
  const { t: tc } = useTranslation("common");
  const { localize } = useLocalized();
  const [searchParams, setSearchParams] = useSearchParams();

  // every filter lives in the URL
  const selectedStatuses = searchParams.get("status")?.split(",").filter(Boolean) || [];
  const serviceId = searchParams.get("serviceId") || "";
  const sort = SORTS.includes(searchParams.get("sort")) ? searchParams.get("sort") : "-createdAt";
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 20;
  const query = { page, pageSize, status: selectedStatuses.join(","), serviceId, sort };

  const applicationsQuery = useQuery({ queryKey: ["applications", "list", query], queryFn: () => getApplications(query), placeholderData: keepPreviousData });
  const servicesQuery = useQuery({ queryKey: ["services", "all"], queryFn: getServices, staleTime: 60 * 1000 });
  const applications = applicationsQuery.data?.data || [];
  const meta = applicationsQuery.data?.meta;
  const hasFilters = selectedStatuses.length > 0 || serviceId;

  function change(changes) {
    const next = new URLSearchParams(searchParams);
    Object.entries({ page: "", ...changes }).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setSearchParams(next);
  }
  const toggleStatus = (status) =>
    change({ status: (selectedStatuses.includes(status) ? selectedStatuses.filter((s) => s !== status) : [...selectedStatuses, status]).join(",") });

  return (
    <div>
      <PageHeader
        title={t("list.title")}
        subtitle={t("list.subtitle")}
        actions={<Link to="/services" className="btn btn-primary">{t("list.newApplication")}</Link>}
      />

      <section className="card mb-4 space-y-3" aria-label={t("filters.title")}>
        <fieldset>
          <legend className="label">{t("filters.status")}</legend>
          <div className="flex flex-wrap gap-3">
            {STATUSES.map((status) => (
              <label key={status} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => toggleStatus(status)} />
                {tc(`status.${status}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="filter-service" className="label">{t("filters.service")}</label>
            <select id="filter-service" className="select" value={serviceId} onChange={(e) => change({ serviceId: e.target.value })}>
              <option value="">{t("filters.all")}</option>
              {(servicesQuery.data || []).map((service) => <option key={service.id} value={service.id}>{localize(service.name)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="filter-sort" className="label">{t("filters.sort")}</label>
            <select id="filter-sort" className="select" value={sort} onChange={(e) => change({ sort: e.target.value === "-createdAt" ? "" : e.target.value })}>
              {SORTS.map((value) => <option key={value} value={value}>{t(`sorts.${value}`)}</option>)}
            </select>
          </div>
          {hasFilters && (
            <div className="flex items-end">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearchParams({})}>{t("filters.reset")}</button>
            </div>
          )}
        </div>
      </section>

      {applicationsQuery.isLoading && <Spinner />}
      {applicationsQuery.isError && <ErrorState error={applicationsQuery.error} onRetry={applicationsQuery.refetch} />}
      {applicationsQuery.isSuccess && applications.length === 0 && (
        <EmptyState
          title={t("list.emptyTitle")}
          text={hasFilters ? t("list.emptyFiltered") : t("list.emptyText")}
          action={<Link to="/services" className="btn btn-primary">{t("list.browseServices")}</Link>}
        />
      )}

      <ul className="space-y-3">
        {applications.map((application) => (
          <li key={application.id}>
            {/* a draft continues in the apply wizard, every other status opens the detail page */}
            <Link
              to={application.status === "DRAFT" ? `/apply/${application.service.id}` : `/applications/${application.id}`}
              className="card block transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{localize(application.service.name)}</p>
                  <p dir="ltr" className="text-start text-xs text-muted">{application.applicationNumber}</p>
                </div>
                <StatusBadge kind="application" value={application.status} />
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                {application.submittedAt && (
                  <div className="flex gap-1"><dt className="text-muted">{t("fields.submittedAt")}:</dt><dd>{formatDate(application.submittedAt, i18n.language)}</dd></div>
                )}
                {application.dueAt && (
                  <div className="flex items-center gap-1">
                    <dt className="text-muted">{t("fields.dueAt")}:</dt>
                    <dd>{formatDate(application.dueAt, i18n.language)}</dd>
                    {application.isOverdue && <span className="badge bg-red-100 text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]"><span className="material-icons me-1" aria-hidden="true">schedule</span>{t("overdue")}</span>}
                  </div>
                )}
                <div className="flex gap-1"><dt className="text-muted">{t("fields.payment")}:</dt><dd><StatusBadge kind="payment" value={application.payment.status} /></dd></div>
              </dl>
              {application.status === "DRAFT" && <p className="mt-2 text-sm font-semibold text-terracotta-dark dark:text-[#8da0ff]">{t("list.continue")}</p>}
            </Link>
          </li>
        ))}
      </ul>
      {meta && <Pagination meta={meta} onPageChange={(next) => change({ page: next === 1 ? "" : String(next) })} />}
    </div>
  );
}

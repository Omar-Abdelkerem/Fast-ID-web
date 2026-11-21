import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner, StatusBadge, useLocalized, useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { exportApplications, getAdminServices, getApplications, getGovernorates } from "../api";

// DRAFT is never offered: drafts do not reach the review queue
const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const SORTS = ["-submittedAt", "submittedAt", "dueAt", "-dueAt"];

// a date input value (YYYY-MM-DD) -> ISO 8601 at the start or the end of that day
const startOfDay = (date) => (date ? new Date(`${date}T00:00:00`).toISOString() : "");
const endOfDay = (date) => (date ? new Date(`${date}T23:59:59.999`).toISOString() : "");

export default function ReviewQueuePage() {
  const { t, i18n } = useTranslation("admin-review");
  const { t: tc } = useTranslation("common");
  const { localize } = useLocalized();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // all filters, the sort and the page are in the URL
  const selectedStatuses = searchParams.get("status")?.split(",").filter(Boolean) || [];
  const serviceId = searchParams.get("serviceId") || "";
  const governorate = searchParams.get("governorate") || "";
  const overdue = searchParams.get("overdue") === "true";
  const q = searchParams.get("q") || "";
  const fromDate = searchParams.get("from") || "";
  const toDate = searchParams.get("to") || "";
  const sort = SORTS.includes(searchParams.get("sort")) ? searchParams.get("sort") : "-submittedAt";
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 20;

  const [search, setSearch] = useState(q);
  const [searchError, setSearchError] = useState("");
  const rangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  // what the list and the export have in common (the export has no page and pageSize)
  const filters = {
    status: selectedStatuses.join(","), serviceId, governorate, overdue: overdue ? "true" : "", q,
    submittedFrom: startOfDay(fromDate), submittedTo: endOfDay(toDate), sort,
  };
  const listParams = { ...filters, page, pageSize };

  const applicationsQuery = useQuery({
    queryKey: ["admin", "applications", listParams],
    queryFn: () => getApplications(listParams),
    placeholderData: keepPreviousData,
    enabled: !rangeInvalid,
  });
  const servicesQuery = useQuery({ queryKey: ["admin", "services"], queryFn: getAdminServices, staleTime: 60 * 1000 });
  const governoratesQuery = useQuery({ queryKey: ["reference", "governorates"], queryFn: getGovernorates, staleTime: Infinity });
  const governorateName = (code) => localize((governoratesQuery.data || []).find((g) => g.code === code)?.name) || code || "—";

  const rows = applicationsQuery.data?.data || [];
  const meta = applicationsQuery.data?.meta;
  const hasFilters = selectedStatuses.length > 0 || serviceId || governorate || overdue || q || fromDate || toDate;

  function change(changes) {
    const next = new URLSearchParams(searchParams);
    Object.entries({ page: "", ...changes }).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setSearchParams(next);
  }
  const toggleStatus = (status) =>
    change({ status: (selectedStatuses.includes(status) ? selectedStatuses.filter((s) => s !== status) : [...selectedStatuses, status]).join(",") });

  function submitSearch(event) {
    event.preventDefault();
    const text = search.trim();
    // the API accepts 3 to 100 characters
    if (text && (text.length < 3 || text.length > 100)) return setSearchError(t("filters.searchHint"));
    setSearchError("");
    change({ q: text });
  }

  const exportMutation = useMutation({
    mutationFn: () => exportApplications(filters),
    onSuccess: ({ blob, filename }) => {
      // save the file with a temporary link
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error) => toast.error(error.code === "EXPORT_TOO_LARGE" ? t("export.tooLarge") : getErrorMessage(error, t)),
  });

  return (
    <div>
      <PageHeader
        title={t("queue.title")}
        subtitle={t("queue.subtitle")}
        actions={
          <button type="button" className="btn btn-primary" disabled={exportMutation.isPending || rangeInvalid} onClick={() => exportMutation.mutate()}>
            <span className="material-icons" aria-hidden="true">download</span>
            {exportMutation.isPending ? t("export.downloading") : t("export.button")}
          </button>
        }
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

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <form onSubmit={submitSearch} className="lg:col-span-2">
            <label htmlFor="queue-q" className="label">{t("filters.search")}</label>
            <div className="flex gap-2">
              <input id="queue-q" className="input" value={search} onChange={(e) => setSearch(e.target.value)} aria-invalid={Boolean(searchError)} />
              <button type="submit" className="btn btn-secondary shrink-0">{t("filters.searchButton")}</button>
            </div>
            {searchError ? <p className="field-error" role="alert">{searchError}</p> : <p className="mt-1 text-xs text-muted">{t("filters.searchHint")}</p>}
          </form>
          <div>
            <label htmlFor="queue-service" className="label">{t("filters.service")}</label>
            <select id="queue-service" className="select" value={serviceId} onChange={(e) => change({ serviceId: e.target.value })}>
              <option value="">{t("filters.all")}</option>
              {(servicesQuery.data || []).map((service) => <option key={service.id} value={service.id}>{localize(service.draft.name)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="queue-governorate" className="label">{t("filters.governorate")}</label>
            <select id="queue-governorate" className="select" value={governorate} onChange={(e) => change({ governorate: e.target.value })}>
              <option value="">{t("filters.all")}</option>
              {(governoratesQuery.data || []).map((g) => <option key={g.code} value={g.code}>{localize(g.name)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="queue-from" className="label">{t("filters.from")}</label>
            <input id="queue-from" type="date" className="input" value={fromDate} onChange={(e) => change({ from: e.target.value })} aria-invalid={rangeInvalid} />
          </div>
          <div>
            <label htmlFor="queue-to" className="label">{t("filters.to")}</label>
            <input id="queue-to" type="date" className="input" value={toDate} onChange={(e) => change({ to: e.target.value })} aria-invalid={rangeInvalid} />
          </div>
          <div>
            <label htmlFor="queue-sort" className="label">{t("filters.sort")}</label>
            <select id="queue-sort" className="select" value={sort} onChange={(e) => change({ sort: e.target.value === "-submittedAt" ? "" : e.target.value })}>
              {SORTS.map((value) => <option key={value} value={value}>{t(`sorts.${value}`)}</option>)}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
            <input type="checkbox" checked={overdue} onChange={(e) => change({ overdue: e.target.checked ? "true" : "" })} />
            {t("filters.overdue")}
          </label>
        </div>
        {rangeInvalid && <p role="alert" className="field-error">{t("filters.rangeInvalid")}</p>}
        {hasFilters && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(""); setSearchParams({}); }}>
            {t("filters.reset")}
          </button>
        )}
      </section>

      {applicationsQuery.isLoading && !rangeInvalid && <Spinner />}
      {applicationsQuery.isError && <ErrorState error={applicationsQuery.error} onRetry={applicationsQuery.refetch} />}
      {applicationsQuery.isSuccess && rows.length === 0 && <EmptyState title={t("queue.emptyTitle")} text={hasFilters ? t("queue.emptyFiltered") : t("queue.emptyText")} />}

      {rows.length > 0 && (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("columns.number")}</th>
                  <th>{t("columns.service")}</th>
                  <th>{t("columns.citizen")}</th>
                  <th>{t("columns.governorate")}</th>
                  <th>{t("columns.status")}</th>
                  <th>{t("columns.submitted")}</th>
                  <th>{t("columns.due")}</th>
                  <th>{t("columns.payment")}</th>
                  <th>{t("columns.delivery")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="cursor-pointer hover:bg-cream dark:hover:bg-[#232963]" onClick={() => navigate(`/admin/applications/${row.id}`)}>
                    <td dir="ltr" className="text-start">
                      {/* a real link so the row can be opened from the keyboard */}
                      <button type="button" className="link font-semibold" onClick={(e) => { e.stopPropagation(); navigate(`/admin/applications/${row.id}`); }}>
                        {row.applicationNumber}
                      </button>
                    </td>
                    <td>{localize(row.service.name)}</td>
                    <td>
                      <span className="font-semibold">{row.citizen.fullName}</span>
                      <span dir="ltr" className="block text-start font-mono text-xs text-muted">{row.citizen.nationalIdMasked}</span>
                    </td>
                    <td>{governorateName(row.governorate)}</td>
                    <td><StatusBadge kind="application" value={row.status} /></td>
                    <td>{formatDate(row.submittedAt, i18n.language)}</td>
                    <td>
                      {formatDate(row.dueAt, i18n.language)}
                      {row.isOverdue && (
                        <span className="badge ms-2 bg-red-100 text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]">
                          <span className="material-icons me-1" aria-hidden="true">schedule</span>{t("overdue")}
                        </span>
                      )}
                    </td>
                    <td><StatusBadge kind="payment" value={row.paymentStatus} /></td>
                    <td>{row.deliveryStatus ? <StatusBadge kind="delivery" value={row.deliveryStatus} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination meta={meta} onPageChange={(next) => change({ page: next === 1 ? "" : String(next) })} />}
        </>
      )}
    </div>
  );
}

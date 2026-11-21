import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PageHeader, Spinner, EmptyState, ErrorState, Pagination, StatusBadge, useLocalized } from "@/components";
import { formatDateTime } from "@/lib/format";
import { getAdminDeliveries, getActiveAgents } from "../api";
import useGovernorates from "../components/useGovernorates";
import DeliveryPanel from "../components/DeliveryPanel";
import AssignModal from "../components/AssignModal";

const STATUSES = ["PENDING_ASSIGNMENT", "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED_ATTEMPT"];

export default function DeliveriesPage() {
  const { t, i18n } = useTranslation("admin-deliveries");
  const { t: tc } = useTranslation("common");
  const { localize } = useLocalized();
  const { list: governorates, nameOf } = useGovernorates();
  const [searchParams, setSearchParams] = useSearchParams();

  const [openId, setOpenId] = useState(null); // delivery shown in the side panel
  const [assigning, setAssigning] = useState(null); // delivery being assigned

  // every filter lives in the URL
  const selectedStatuses = searchParams.get("status")?.split(",").filter(Boolean) || [];
  const governorate = searchParams.get("governorate") || "";
  const agentId = searchParams.get("agentId") || "";
  const unassigned = searchParams.get("unassigned") === "true";
  const sort = searchParams.get("sort") || "-createdAt";
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 20;

  const params = { page, pageSize, sort, status: selectedStatuses.join(","), governorate, agentId, unassigned: unassigned ? "true" : "" };

  const deliveriesQuery = useQuery({
    queryKey: ["admin", "deliveries", params],
    queryFn: () => getAdminDeliveries(params),
    placeholderData: keepPreviousData,
  });
  const agentsQuery = useQuery({ queryKey: ["admin", "staff", "agents"], queryFn: getActiveAgents });

  // changing a filter goes back to page 1
  const updateParam = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries({ page: "", ...changes }).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setSearchParams(next);
  };

  const toggleStatus = (status) => {
    const next = selectedStatuses.includes(status) ? selectedStatuses.filter((s) => s !== status) : [...selectedStatuses, status];
    updateParam({ status: next.join(",") });
  };

  const deliveries = deliveriesQuery.data?.data || [];
  const meta = deliveriesQuery.data?.meta;
  const hasFilters = selectedStatuses.length > 0 || governorate || agentId || unassigned;

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

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
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="label" htmlFor="filter-governorate">{t("filters.governorate")}</label>
            <select id="filter-governorate" className="select" value={governorate} onChange={(e) => updateParam({ governorate: e.target.value })}>
              <option value="">{t("filters.all")}</option>
              {governorates.map((g) => <option key={g.code} value={g.code}>{localize(g.name)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-agent">{t("filters.agent")}</label>
            <select id="filter-agent" className="select" value={agentId} onChange={(e) => updateParam({ agentId: e.target.value })}>
              <option value="">{t("filters.all")}</option>
              {(agentsQuery.data || []).map((a) => <option key={a.id} value={a.id}>{a.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="filter-sort">{t("filters.sort")}</label>
            <select id="filter-sort" className="select" value={sort} onChange={(e) => updateParam({ sort: e.target.value === "-createdAt" ? "" : e.target.value })}>
              <option value="-createdAt">{t("filters.newest")}</option>
              <option value="createdAt">{t("filters.oldest")}</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
            <input type="checkbox" checked={unassigned} onChange={(e) => updateParam({ unassigned: e.target.checked ? "true" : "" })} />
            {t("filters.unassigned")}
          </label>
        </div>
        {hasFilters && <button className="btn btn-secondary btn-sm" onClick={() => setSearchParams({})}>{t("filters.clear")}</button>}
      </section>

      {deliveriesQuery.isLoading && <Spinner />}
      {deliveriesQuery.isError && <ErrorState error={deliveriesQuery.error} onRetry={deliveriesQuery.refetch} />}
      {deliveriesQuery.isSuccess && deliveries.length === 0 && <EmptyState title={t("empty.title")} text={hasFilters ? t("empty.filtered") : t("empty.text")} />}

      {deliveries.length > 0 && (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("columns.application")}</th>
                  <th>{t("columns.service")}</th>
                  <th>{t("columns.recipient")}</th>
                  <th>{t("columns.location")}</th>
                  <th>{t("columns.status")}</th>
                  <th>{t("columns.agent")}</th>
                  <th>{t("columns.attempts")}</th>
                  <th>{t("columns.lastFailure")}</th>
                  <th>{t("columns.assignedAt")}</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="cursor-pointer hover:bg-cream" onClick={() => setOpenId(d.id)}>
                    <td dir="ltr" className="text-start">
                      {/* a real button so the row can be opened from the keyboard */}
                      <button className="link font-semibold" onClick={(e) => { e.stopPropagation(); setOpenId(d.id); }}>{d.applicationNumber}</button>
                    </td>
                    <td>{localize(d.service.name)}</td>
                    <td>{d.recipient.fullName}</td>
                    <td>{nameOf(d.recipient.governorate)} · {d.recipient.city}</td>
                    <td><StatusBadge value={d.status} /></td>
                    <td>{d.agent ? d.agent.fullName : <span className="text-muted">{t("unassigned")}</span>}</td>
                    <td>{d.attempts}</td>
                    <td>{d.lastFailure ? t(`reasons.${d.lastFailure.reasonCode}`) : "—"}</td>
                    <td>{d.assignedAt ? formatDateTime(d.assignedAt, i18n.language) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meta && <Pagination meta={meta} onPageChange={(p) => updateParam({ page: p === 1 ? "" : String(p) })} />}
        </>
      )}

      {openId && <DeliveryPanel deliveryId={openId} onClose={() => setOpenId(null)} onAssign={setAssigning} />}
      <AssignModal key={assigning?.id} delivery={assigning} onClose={() => setAssigning(null)} />
    </div>
  );
}

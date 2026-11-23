import { Fragment, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner } from "@/components";
import { formatDateTime } from "@/lib/format";
import { getAuditLogs } from "../api";

const ACTIONS = [
  "APPLICATION_SUBMITTED", "APPLICATION_REVIEW_STARTED", "APPLICATION_APPROVED", "APPLICATION_REJECTED", "APPLICATION_CANCELLED",
  "CREDENTIAL_ISSUED", "CREDENTIAL_REVOKED", "DELIVERY_CREATED", "DELIVERY_ASSIGNED", "DELIVERY_OUT_FOR_DELIVERY", "DELIVERY_FAILED",
  "DELIVERY_COMPLETED", "SERVICE_CREATED", "SERVICE_UPDATED", "SERVICE_PUBLISHED", "SERVICE_UNPUBLISHED", "SERVICE_DELETED",
  "STAFF_CREATED", "STAFF_UPDATED", "CITIZEN_DEACTIVATED", "CITIZEN_REACTIVATED", "PAYMENT_MARKED_PAID_MOCK", "PASSWORD_RESET_COMPLETED", "SETTINGS_UPDATED",
];
const ENTITY_TYPES = ["APPLICATION", "SERVICE", "CREDENTIAL", "DELIVERY", "USER", "SETTINGS"];

// a date input value (YYYY-MM-DD) -> ISO 8601 at the start or the end of that day
const startOfDay = (date) => (date ? new Date(`${date}T00:00:00`).toISOString() : "");
const endOfDay = (date) => (date ? new Date(`${date}T23:59:59.999`).toISOString() : "");

export default function AuditLogsPage() {
  const { t, i18n } = useTranslation("audit-logs");
  const [searchParams, setSearchParams] = useSearchParams();
  const [openId, setOpenId] = useState(null); // the expanded row

  // every filter lives in the URL
  const selectedActions = searchParams.get("action")?.split(",").filter(Boolean) || [];
  const entityType = searchParams.get("entityType") || "";
  const entityId = searchParams.get("entityId") || "";
  const actorId = searchParams.get("actorId") || "";
  const fromDate = searchParams.get("from") || "";
  const toDate = searchParams.get("to") || "";
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 20;

  const rangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  const query = {
    page, pageSize, action: selectedActions.join(","), entityType, entityId, actorId,
    from: startOfDay(fromDate), to: endOfDay(toDate),
  };
  const logsQuery = useQuery({
    queryKey: ["admin", "audit-logs", query],
    queryFn: () => getAuditLogs(query),
    placeholderData: keepPreviousData,
    enabled: !rangeInvalid, // "from" must not be after "to"
  });
  const logs = logsQuery.data?.data || [];
  const meta = logsQuery.data?.meta;
  const hasFilters = selectedActions.length > 0 || entityType || entityId || actorId || fromDate || toDate;

  function change(changes) {
    const next = new URLSearchParams(searchParams);
    Object.entries({ page: "", ...changes }).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setSearchParams(next);
  }
  const toggleAction = (action) =>
    change({ action: (selectedActions.includes(action) ? selectedActions.filter((a) => a !== action) : [...selectedActions, action]).join(",") });

  // unknown actions from the server are shown as they are
  const actionLabel = (action) => t(`actions.${action}`, { defaultValue: action });

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <section className="card mb-4 space-y-3" aria-label={t("filters.title")}>
        <details>
          <summary className="cursor-pointer text-sm font-semibold">
            {t("filters.action")} {selectedActions.length > 0 && `(${selectedActions.length})`}
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIONS.map((action) => (
              <label key={action} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedActions.includes(action)} onChange={() => toggleAction(action)} />
                {actionLabel(action)}
              </label>
            ))}
          </div>
        </details>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <label htmlFor="log-entity-type" className="label">{t("filters.entityType")}</label>
            <select id="log-entity-type" className="select" value={entityType} onChange={(e) => change({ entityType: e.target.value })}>
              <option value="">{t("filters.all")}</option>
              {ENTITY_TYPES.map((type) => <option key={type} value={type}>{t(`entityTypes.${type}`)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="log-entity-id" className="label">{t("filters.entityId")}</label>
            <input id="log-entity-id" dir="ltr" className="input text-start" defaultValue={entityId} onBlur={(e) => e.target.value.trim() !== entityId && change({ entityId: e.target.value.trim() })} />
          </div>
          <div>
            <label htmlFor="log-actor-id" className="label">{t("filters.actorId")}</label>
            <input id="log-actor-id" dir="ltr" className="input text-start" defaultValue={actorId} onBlur={(e) => e.target.value.trim() !== actorId && change({ actorId: e.target.value.trim() })} />
          </div>
          <div>
            <label htmlFor="log-from" className="label">{t("filters.from")}</label>
            <input id="log-from" type="date" className="input" value={fromDate} onChange={(e) => change({ from: e.target.value })} aria-invalid={rangeInvalid} />
          </div>
          <div>
            <label htmlFor="log-to" className="label">{t("filters.to")}</label>
            <input id="log-to" type="date" className="input" value={toDate} onChange={(e) => change({ to: e.target.value })} aria-invalid={rangeInvalid} />
          </div>
        </div>
        {rangeInvalid && <p role="alert" className="field-error">{t("filters.rangeInvalid")}</p>}
        {hasFilters && <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearchParams({})}>{t("filters.reset")}</button>}
      </section>

      {logsQuery.isLoading && !rangeInvalid && <Spinner />}
      {logsQuery.isError && <ErrorState error={logsQuery.error} onRetry={logsQuery.refetch} />}
      {logsQuery.isSuccess && logs.length === 0 && <EmptyState title={t("emptyTitle")} text={t("emptyText")} />}

      {logs.length > 0 && (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("columns.time")}</th>
                  <th>{t("columns.actor")}</th>
                  <th>{t("columns.action")}</th>
                  <th>{t("columns.entityType")}</th>
                  <th>{t("columns.entityId")}</th>
                  <th><span className="sr-only">{t("columns.details")}</span></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const open = openId === log.id;
                  const entries = Object.entries(log.metadata || {});
                  return (
                    <Fragment key={log.id}>
                      <tr>
                        <td className="whitespace-nowrap">{formatDateTime(log.createdAt, i18n.language)}</td>
                        <td>{log.actor ? `${log.actor.fullName} (${t(`roles.${log.actor.role}`)})` : t("system")}</td>
                        <td className="font-semibold">{actionLabel(log.action)}</td>
                        <td>{t(`entityTypes.${log.entityType}`, { defaultValue: log.entityType })}</td>
                        <td dir="ltr" className="max-w-[12rem] truncate text-start font-mono text-xs">{log.entityId}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            aria-expanded={open}
                            disabled={entries.length === 0}
                            onClick={() => setOpenId(open ? null : log.id)}
                          >
                            {open ? t("columns.hide") : t("columns.details")}
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={6} className="bg-cream dark:bg-[#232963]">
                            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                              {entries.map(([key, value]) => (
                                <div key={key} className="flex gap-2">
                                  <dt className="font-mono text-muted" dir="ltr">{key}:</dt>
                                  <dd dir="ltr" className="text-start">{String(value)}</dd>
                                </div>
                              ))}
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPageChange={(next) => change({ page: next === 1 ? "" : String(next) })} />
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, Spinner, useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { getCitizens, setCitizenActive } from "../api";
import useListParams from "../components/useListParams";

export default function CitizensPage() {
  const { t, i18n } = useTranslation("admin-people");
  const toast = useToast();
  const queryClient = useQueryClient();
  const { params, page, pageSize, changeParams, reset } = useListParams();
  const [pending, setPending] = useState(null); // the citizen whose status is about to change
  const [search, setSearch] = useState(params.q || "");
  const [searchError, setSearchError] = useState("");

  const query = { page, pageSize, q: params.q, isActive: params.isActive };
  const citizensQuery = useQuery({ queryKey: ["admin", "citizens", query], queryFn: () => getCitizens(query), placeholderData: keepPreviousData });
  const citizens = citizensQuery.data?.data || [];
  const meta = citizensQuery.data?.meta;

  const statusMutation = useMutation({
    mutationFn: ({ citizen, isActive }) => setCitizenActive(citizen.id, isActive),
    onSuccess: (_data, { isActive }) => {
      toast.success(t(isActive ? "citizens.activated" : "citizens.deactivated"));
      queryClient.invalidateQueries({ queryKey: ["admin", "citizens"] });
      setPending(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
      queryClient.invalidateQueries({ queryKey: ["admin", "citizens"] });
      setPending(null);
    },
  });

  function submitSearch(event) {
    event.preventDefault();
    const text = search.trim();
    // the API accepts 3 to 100 characters
    if (text && (text.length < 3 || text.length > 100)) return setSearchError(t("citizens.searchHint"));
    setSearchError("");
    changeParams({ q: text });
  }

  return (
    <div>
      <PageHeader title={t("citizens.title")} subtitle={t("citizens.subtitle")} />

      <form onSubmit={submitSearch} className="card mb-4 grid gap-3 md:grid-cols-3" aria-label={t("filters.title")}>
        <div>
          <label htmlFor="citizen-q" className="label">{t("filters.search")}</label>
          <input id="citizen-q" className="input" value={search} onChange={(e) => setSearch(e.target.value)} aria-invalid={Boolean(searchError)} />
          {searchError ? <p className="field-error">{searchError}</p> : <p className="mt-1 text-xs text-muted">{t("citizens.searchHint")}</p>}
        </div>
        <div>
          <label htmlFor="citizen-active" className="label">{t("filters.status")}</label>
          <select id="citizen-active" className="select" value={params.isActive || ""} onChange={(e) => changeParams({ isActive: e.target.value })}>
            <option value="">{t("filters.all")}</option>
            <option value="true">{t("active")}</option>
            <option value="false">{t("inactive")}</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary btn-sm">{t("filters.apply")}</button>
          {(params.q || params.isActive) && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(""); reset(); }}>{t("filters.reset")}</button>}
        </div>
      </form>

      {citizensQuery.isLoading && <Spinner />}
      {citizensQuery.isError && <ErrorState error={citizensQuery.error} onRetry={citizensQuery.refetch} />}
      {citizensQuery.isSuccess && citizens.length === 0 && <EmptyState title={t("citizens.emptyTitle")} text={t("citizens.emptyText")} />}

      {citizens.length > 0 && (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("staff.fullName")}</th>
                  <th>{t("citizens.nationalId")}</th>
                  <th>{t("staff.email")}</th>
                  <th>{t("staff.phone")}</th>
                  <th>{t("created")}</th>
                  <th>{t("filters.status")}</th>
                </tr>
              </thead>
              <tbody>
                {citizens.map((citizen) => (
                  <tr key={citizen.id}>
                    <td className="font-semibold">{citizen.fullName}</td>
                    <td dir="ltr" className="text-start font-mono">{citizen.nationalIdMasked}</td>
                    <td dir="ltr" className="text-start">{citizen.email}</td>
                    <td dir="ltr" className="text-start">{citizen.phone}</td>
                    <td>{formatDate(citizen.createdAt, i18n.language)}</td>
                    <td>
                      {/* a real switch, with the state written next to it */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={citizen.isActive}
                        aria-label={`${citizen.fullName}: ${citizen.isActive ? t("active") : t("inactive")}`}
                        onClick={() => setPending(citizen)}
                        className="inline-flex items-center gap-2 text-sm"
                      >
                        <span dir="ltr" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${citizen.isActive ? "bg-terracotta-dark" : "bg-tan"}`}>
                          <span className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${citizen.isActive ? "translate-x-5" : "translate-x-0"}`} />
                        </span>
                        {citizen.isActive ? t("active") : t("inactive")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPageChange={(next) => changeParams({ page: next === 1 ? "" : String(next) })} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending ? t(pending.isActive ? "citizens.deactivateTitle" : "citizens.activateTitle") : ""}
        message={pending ? t(pending.isActive ? "citizens.deactivateMessage" : "citizens.activateMessage", { name: pending.fullName }) : ""}
        confirmText={pending ? t(pending.isActive ? "citizens.deactivate" : "citizens.activate") : ""}
        danger={Boolean(pending?.isActive)}
        isLoading={statusMutation.isPending}
        onConfirm={() => statusMutation.mutate({ citizen: pending, isActive: !pending.isActive })}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner, useLocalized } from "@/components";
import { formatDate } from "@/lib/format";
import { getGovernorates, getStaff } from "../api";
import useListParams from "../components/useListParams";
import StaffFormModal from "../components/StaffFormModal";

export default function StaffPage() {
  const { t, i18n } = useTranslation("admin-people");
  const { localize } = useLocalized();
  const { params, page, pageSize, changeParams, reset } = useListParams();
  const [editing, setEditing] = useState(null); // a staff user, "new", or null
  const [search, setSearch] = useState(params.q || "");
  const [searchError, setSearchError] = useState("");

  const query = {
    page, pageSize,
    role: params.role, isActive: params.isActive, q: params.q, sort: params.sort,
  };
  const staffQuery = useQuery({ queryKey: ["admin", "staff", query], queryFn: () => getStaff(query), placeholderData: keepPreviousData });
  const governoratesQuery = useQuery({ queryKey: ["reference", "governorates"], queryFn: getGovernorates, staleTime: Infinity });
  const governorateName = (code) => localize((governoratesQuery.data || []).find((g) => g.code === code)?.name) || code || "—";

  const staff = staffQuery.data?.data || [];
  const meta = staffQuery.data?.meta;
  const hasFilters = Boolean(params.role || params.isActive || params.q || params.sort);

  function submitSearch(event) {
    event.preventDefault();
    const text = search.trim();
    // the API accepts 2 to 100 characters
    if (text && (text.length < 2 || text.length > 100)) return setSearchError(t("filters.searchHint"));
    setSearchError("");
    changeParams({ q: text });
  }

  return (
    <div>
      <PageHeader
        title={t("staff.title")}
        subtitle={t("staff.subtitle")}
        actions={<button type="button" className="btn btn-primary" onClick={() => setEditing("new")}>{t("staff.add")}</button>}
      />

      <form onSubmit={submitSearch} className="card mb-4 grid gap-3 md:grid-cols-5" aria-label={t("filters.title")}>
        <div className="md:col-span-2">
          <label htmlFor="staff-q" className="label">{t("filters.search")}</label>
          <input id="staff-q" className="input" value={search} onChange={(e) => setSearch(e.target.value)} aria-invalid={Boolean(searchError)} />
          {searchError ? <p className="field-error">{searchError}</p> : <p className="mt-1 text-xs text-muted">{t("filters.searchHint")}</p>}
        </div>
        <div>
          <label htmlFor="staff-role-filter" className="label">{t("filters.role")}</label>
          <select id="staff-role-filter" className="select" value={params.role || ""} onChange={(e) => changeParams({ role: e.target.value })}>
            <option value="">{t("filters.all")}</option>
            <option value="ADMIN">{t("roles.ADMIN")}</option>
            <option value="AGENT">{t("roles.AGENT")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="staff-active-filter" className="label">{t("filters.status")}</label>
          <select id="staff-active-filter" className="select" value={params.isActive || ""} onChange={(e) => changeParams({ isActive: e.target.value })}>
            <option value="">{t("filters.all")}</option>
            <option value="true">{t("active")}</option>
            <option value="false">{t("inactive")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="staff-sort" className="label">{t("filters.sort")}</label>
          <select id="staff-sort" className="select" value={params.sort || ""} onChange={(e) => changeParams({ sort: e.target.value })}>
            <option value="">{t("filters.newest")}</option>
            <option value="createdAt">{t("filters.oldest")}</option>
            <option value="fullName">{t("filters.nameAsc")}</option>
            <option value="-fullName">{t("filters.nameDesc")}</option>
          </select>
        </div>
        <div className="flex gap-2 md:col-span-5">
          <button type="submit" className="btn btn-primary btn-sm">{t("filters.apply")}</button>
          {hasFilters && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(""); reset(); }}>{t("filters.reset")}</button>}
        </div>
      </form>

      {staffQuery.isLoading && <Spinner />}
      {staffQuery.isError && <ErrorState error={staffQuery.error} onRetry={staffQuery.refetch} />}
      {staffQuery.isSuccess && staff.length === 0 && <EmptyState title={t("staff.emptyTitle")} text={t("staff.emptyText")} />}

      {staff.length > 0 && (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("staff.fullName")}</th>
                  <th>{t("staff.email")}</th>
                  <th>{t("staff.phone")}</th>
                  <th>{t("staff.role")}</th>
                  <th>{t("staff.governorate")}</th>
                  <th>{t("filters.status")}</th>
                  <th>{t("created")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((user) => (
                  <tr key={user.id}>
                    <td className="font-semibold">{user.fullName}</td>
                    <td dir="ltr" className="text-start">{user.email}</td>
                    <td dir="ltr" className="text-start">{user.phone}</td>
                    <td>{t(`roles.${user.role}`)}</td>
                    <td>{governorateName(user.governorate)}</td>
                    <td>
                      <span className={`badge ${user.isActive ? "bg-green-100 text-success dark:bg-[#17382c] dark:text-[#7fd1a8]" : "bg-red-100 text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]"}`}>
                        {user.isActive ? t("active") : t("inactive")}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt, i18n.language)}</td>
                    <td><button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(user)}>{t("edit")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={meta} onPageChange={(next) => changeParams({ page: next === 1 ? "" : String(next) })} />
        </>
      )}

      {editing && <StaffFormModal key={editing === "new" ? "new" : editing.id} staff={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

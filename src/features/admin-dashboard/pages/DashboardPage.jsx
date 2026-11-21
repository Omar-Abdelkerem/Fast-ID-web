import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, PageHeader, Spinner } from "@/components";
import { getStats } from "../api";
import BarList from "../components/BarList";

// the contract always sends every key, and these are the orders they are shown in
const APPLICATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const DELIVERY_STATUSES = ["PENDING_ASSIGNMENT", "ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED_ATTEMPT"];

function StatCard({ to, icon, label, value, warn }) {
  return (
    <Link to={to} className="card flex items-center gap-3 transition-shadow hover:shadow-md">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${warn ? "bg-red-100 text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]" : "bg-beige text-terracotta-dark dark:bg-[#232963] dark:text-[#8da0ff]"}`}>
        <span className="material-icons" aria-hidden="true">{icon}</span>
      </span>
      <span>
        <span className="block text-3xl font-bold leading-none">{value}</span>
        <span className="text-sm text-muted">{label}</span>
      </span>
    </Link>
  );
}

const statusIcons = { SUBMITTED: "inbox", UNDER_REVIEW: "fact_check", APPROVED: "check_circle", REJECTED: "cancel", OUT_FOR_DELIVERY: "local_shipping", DELIVERED: "inventory_2", CANCELLED: "block" };

export default function DashboardPage() {
  const { t } = useTranslation("admin-dashboard");
  const { t: tc } = useTranslation("common");

  // refetch every 60 seconds
  const statsQuery = useQuery({ queryKey: ["admin", "stats"], queryFn: getStats, refetchInterval: 60 * 1000 });

  if (statsQuery.isLoading) return <Spinner />;
  if (statsQuery.isError) return <ErrorState error={statsQuery.error} onRetry={statsQuery.refetch} />;

  const stats = statsQuery.data;
  const hours = stats.averageDecisionHours30d;

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <section aria-labelledby="apps-title" className="mb-6">
        <h2 id="apps-title" className="mb-3 text-lg font-bold">{t("applications")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {APPLICATION_STATUSES.map((status) => (
            <StatCard key={status} to={`/admin/applications?status=${status}`} icon={statusIcons[status]} label={tc(`status.${status}`)} value={stats.applicationsByStatus[status] ?? 0} />
          ))}
          <StatCard to="/admin/applications?overdue=true" icon="schedule" label={t("overdue")} value={stats.overdueApplications} warn={stats.overdueApplications > 0} />
          <StatCard to="/admin/deliveries?unassigned=true" icon="assignment_late" label={t("unassigned")} value={stats.unassignedDeliveries} warn={stats.unassignedDeliveries > 0} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card" aria-labelledby="deliveries-title">
          <h2 id="deliveries-title" className="mb-3 text-lg font-bold">{t("deliveries")}</h2>
          <BarList items={DELIVERY_STATUSES.map((status) => ({ key: status, label: tc(`status.${status}`), value: stats.deliveriesByStatus[status] ?? 0 }))} />
        </section>

        <section className="card" aria-labelledby="speed-title">
          <h2 id="speed-title" className="mb-3 text-lg font-bold">{t("speedTitle")}</h2>
          <p className="text-4xl font-bold">{hours === null ? t("notEnoughData") : t("hours", { value: hours.toFixed(1) })}</p>
          <p className="mt-1 text-sm text-muted">{t("speedText")}</p>
        </section>
      </div>
    </div>
  );
}

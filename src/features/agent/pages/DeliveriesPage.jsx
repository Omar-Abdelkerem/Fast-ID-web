import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PageHeader, Spinner, EmptyState, ErrorState, Pagination, StatusBadge } from "@/components";
import { getAgentDeliveries } from "../api";
import useGovernorateName from "../components/useGovernorateName";

// each tab is a list of statuses (sent to the API comma separated)
const tabs = {
  active: "ASSIGNED,OUT_FOR_DELIVERY",
  failed: "FAILED_ATTEMPT",
  delivered: "DELIVERED",
};

export default function DeliveriesPage() {
  const { t } = useTranslation("agent");
  const governorateName = useGovernorateName();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = tabs[searchParams.get("tab")] ? searchParams.get("tab") : "active";
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 20;
  const params = { status: tabs[tab], page, pageSize, sort: "assignedAt" };

  const query = useQuery({
    queryKey: ["agent", "deliveries", params],
    queryFn: () => getAgentDeliveries(params),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true, // new assignments arrive while the agent is away
  });

  const deliveries = query.data?.data || [];
  const meta = query.data?.meta;

  const changeTab = (next) => setSearchParams(next === "active" ? {} : { tab: next });
  const changePage = (next) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === 1) nextParams.delete("page");
    else nextParams.set("page", String(next));
    setSearchParams(nextParams);
  };

  return (
    <div>
      <PageHeader title={t("list.title")} />

      <div role="tablist" aria-label={t("list.title")} className="mb-4 grid grid-cols-3 gap-2">
        {Object.keys(tabs).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => changeTab(key)}
            className={`btn min-h-[48px] text-sm ${tab === key ? "btn-primary" : "btn-secondary dark:bg-transparent dark:text-[#E8F0FE] dark:border-[#8da0ff] dark:hover:bg-[#232963]"}`}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {query.isLoading && <Spinner />}
      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}
      {query.isSuccess && deliveries.length === 0 && <EmptyState title={t(`empty.${tab}.title`)} text={t(`empty.${tab}.text`)} />}

      <ul className="space-y-3">
        {deliveries.map((delivery) => (
          <li key={delivery.id}>
            <Link to={`/agent/deliveries/${delivery.id}`} className="card dark:bg-[#1b2048] dark:border-[#2f3670] block min-h-[64px] hover:bg-beige dark:hover:bg-[#232963] focus-visible:outline focus-visible:outline-2 focus-visible:outline-espresso">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{delivery.recipientName}</p>
                  <p dir="ltr" className="text-start text-xs text-muted dark:text-[#A9B0D6]">{delivery.applicationNumber}</p>
                  <p className="mt-1 text-sm">{governorateName(delivery.address.governorate)} · {delivery.address.city}</p>
                </div>
                <StatusBadge value={delivery.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {meta && meta.totalPages > 1 && <Pagination meta={meta} onPageChange={changePage} />}
    </div>
  );
}

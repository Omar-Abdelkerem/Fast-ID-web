import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, PageHeader, Spinner, useLocalized } from "@/components";
import { getServices } from "../api";
import ServiceCard from "../components/ServiceCard";

const categories = ["IDENTITY", "LICENSE", "CIVIL_RECORD", "OTHER"];

export default function CatalogPage() {
  const { t } = useTranslation("catalog");
  const { localize } = useLocalized();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");

  // the category lives in the URL so the view can be shared
  const category = categories.includes(searchParams.get("category")) ? searchParams.get("category") : "";

  const servicesQuery = useQuery({
    queryKey: ["services", { category }],
    queryFn: () => getServices(category),
    staleTime: 60 * 1000, // the catalog is cacheable
  });

  const changeCategory = (value) => setSearchParams(value ? { category: value } : {});

  // client-side search by name
  const text = search.trim().toLowerCase();
  const services = (servicesQuery.data || []).filter((service) => !text || localize(service.name).toLowerCase().includes(text));

  return (
    <div>
      <PageHeader title={t("catalog.title")} subtitle={t("catalog.subtitle")} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div role="group" aria-label={t("catalog.category")} className="flex flex-wrap gap-2">
          {["", ...categories].map((value) => (
            <button
              key={value || "all"}
              type="button"
              aria-pressed={category === value}
              onClick={() => changeCategory(value)}
              className={`btn btn-sm ${category === value ? "btn-primary" : "btn-secondary"}`}
            >
              {value ? t(`category.${value}`) : t("catalog.all")}
            </button>
          ))}
        </div>
        <div className="ms-auto w-full sm:w-64">
          <label htmlFor="service-search" className="label">{t("catalog.search")}</label>
          <input id="service-search" className="input" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
      </div>

      {servicesQuery.isLoading && <Spinner />}
      {servicesQuery.isError && <ErrorState error={servicesQuery.error} onRetry={servicesQuery.refetch} />}
      {servicesQuery.isSuccess && services.length === 0 && <EmptyState title={t("catalog.emptyTitle")} text={t("catalog.emptyText")} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}

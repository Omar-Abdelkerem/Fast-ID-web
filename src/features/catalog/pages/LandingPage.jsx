import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components";
import { useAuth, getRoleHome } from "@/lib/auth";
import { getServices } from "../api";
import ServiceCard from "../components/ServiceCard";

const steps = [
  { key: "apply", icon: "edit_document" },
  { key: "review", icon: "fact_check" },
  { key: "issue", icon: "badge" },
  { key: "delivered", icon: "local_shipping" },
];

export default function LandingPage() {
  const { t } = useTranslation("catalog");
  const { user } = useAuth();
  const featuredQuery = useQuery({ queryKey: ["services", "featured"], queryFn: () => getServices(), staleTime: 60 * 1000 });
  const featured = (featuredQuery.data || []).slice(0, 3);

  // signed-in users go straight to their home
  const startLink = user ? getRoleHome(user.role) : "/register";

  return (
    <div className="space-y-12">
      <section className="rounded-3xl bg-gradient-to-br from-[#232963] to-[#4966F0] p-8 text-white md:p-12">
        <p className="mb-2 text-sm opacity-80">{t("landing.tagline")}</p>
        <h1 className="font-heading text-3xl font-bold md:text-5xl">{t("landing.title")}</h1>
        <p className="mt-3 max-w-xl text-lg opacity-90">{t("landing.promise")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={startLink} className="btn bg-white text-espresso hover:opacity-90">{t("landing.getStarted")}</Link>
          <Link to="/services" className="btn border-2 border-white text-white hover:bg-white/10">{t("landing.browse")}</Link>
        </div>
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="page-title mb-4">{t("landing.howTitle")}</h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.key} className="card flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-beige text-terracotta-dark dark:bg-[#232963] dark:text-[#8da0ff]">
                <span className="material-icons" aria-hidden="true">{step.icon}</span>
              </span>
              <div>
                <p className="text-xs text-muted">{t("landing.step", { number: index + 1 })}</p>
                <p className="font-bold">{t(`landing.steps.${step.key}.title`)}</p>
                <p className="text-sm text-muted">{t(`landing.steps.${step.key}.text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="featured-title">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="featured-title" className="page-title">{t("landing.featured")}</h2>
          <Link to="/services" className="link text-sm">{t("landing.allServices")}</Link>
        </div>
        {featuredQuery.isLoading && <Spinner />}
        {featuredQuery.isError && <p role="alert" className="text-sm text-danger">{t("landing.loadError")}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>
    </div>
  );
}

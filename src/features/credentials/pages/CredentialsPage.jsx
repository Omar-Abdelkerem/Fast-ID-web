import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { EmptyState, ErrorState, PageHeader, Spinner } from "@/components";
import { getCredentials } from "../api";
import CredentialCard from "../components/CredentialCard";

export default function CredentialsPage() {
  const { t } = useTranslation("credentials");
  const query = useQuery({ queryKey: ["credentials"], queryFn: getCredentials });
  const credentials = query.data || [];

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {query.isLoading && <Spinner />}
      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}
      {query.isSuccess && credentials.length === 0 && (
        <EmptyState title={t("emptyTitle")} text={t("emptyText")} action={<Link to="/applications" className="btn btn-primary">{t("emptyAction")}</Link>} />
      )}
      <div className="space-y-4">
        {credentials.map((credential) => (
          <CredentialCard key={credential.id} credential={credential} />
        ))}
      </div>
    </div>
  );
}

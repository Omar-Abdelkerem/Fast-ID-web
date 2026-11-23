import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, Spinner, useLocalized } from "@/components";
import { formatDate } from "@/lib/format";
import { verifyCredential } from "../api";

// icon + text + colour, so the state never depends on colour alone
const states = {
  ACTIVE: { icon: "verified", box: "bg-green-100 text-success dark:bg-[#17382c] dark:text-[#7fd1a8]" },
  REVOKED: { icon: "gpp_bad", box: "bg-red-100 text-danger dark:bg-[#4a1f24] dark:text-[#ff8a80]" },
  EXPIRED: { icon: "history_toggle_off", box: "bg-amber-100 text-warning dark:bg-[#3d3010] dark:text-[#f0c36a]" },
};

export default function VerifyResultPage() {
  const { qrToken } = useParams();
  const { t, i18n } = useTranslation("verify");
  const { localize } = useLocalized();

  const query = useQuery({ queryKey: ["verify", qrToken], queryFn: () => verifyCredential(qrToken), retry: false });

  if (query.isLoading) return <Spinner />;

  if (query.isError) {
    if (query.error.code === "CREDENTIAL_NOT_FOUND") {
      return (
        <div className="mx-auto max-w-lg text-center">
          <div role="alert" className="card space-y-3 py-8">
            <span className="material-icons text-muted" style={{ fontSize: "3rem" }} aria-hidden="true">search_off</span>
            <h1 className="page-title">{t("result.notFoundTitle")}</h1>
            <p className="text-sm text-muted">{t("result.notFoundText")}</p>
            <Link to="/verify" className="btn btn-primary">{t("result.tryAnother")}</Link>
          </div>
        </div>
      );
    }
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  }

  const { valid, status, credential } = query.data;
  // "Valid" is shown only when the API says valid
  const state = valid ? states.ACTIVE : states[status] || states.EXPIRED;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div role="status" className={`rounded-2xl p-6 text-center ${state.box}`}>
        <span className="material-icons" style={{ fontSize: "4rem" }} aria-hidden="true">{state.icon}</span>
        <h1 className="font-heading text-2xl font-bold">{valid ? t("result.valid") : t(`result.${status}`)}</h1>
        <p className="mt-1 text-sm">{valid ? t("result.validText") : t(`result.${status}Text`)}</p>
      </div>

      <dl className="card grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">{t("result.number")}</dt>
          <dd className="font-mono font-semibold" dir="ltr">{credential.number}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t("result.service")}</dt>
          <dd className="font-semibold">{localize(credential.service.name)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t("result.holder")}</dt>
          <dd className="font-semibold" dir="auto">{credential.holderName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t("result.issuedAt")}</dt>
          <dd className="font-semibold">{formatDate(credential.issuedAt, i18n.language)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">{t("result.expiresAt")}</dt>
          <dd className="font-semibold">{credential.expiresAt ? formatDate(credential.expiresAt, i18n.language) : t("result.noExpiry")}</dd>
        </div>
      </dl>
      <div className="text-center">
        <Link to="/verify" className="link text-sm">{t("result.tryAnother")}</Link>
      </div>
    </div>
  );
}

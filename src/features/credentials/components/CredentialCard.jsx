import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { StatusBadge, useLocalized, useToast } from "@/components";
import { formatDate } from "@/lib/format";

export default function CredentialCard({ credential }) {
  const { t, i18n } = useTranslation("credentials");
  const { localize } = useLocalized();
  const toast = useToast();

  const verifyUrl = `${window.location.origin}/verify/${credential.qrToken}`;
  const inactive = credential.status !== "ACTIVE";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success(t("card.copied"));
    } catch {
      toast.error(t("card.copyFailed"));
    }
  }

  return (
    <article className={`card flex flex-col gap-4 sm:flex-row ${inactive ? "opacity-70" : ""}`} aria-label={credential.number}>
      {/* the QR always stays dark on white with a quiet zone, also in dark mode, so scanners can read it */}
      <div className="self-center rounded-xl bg-white p-3">
        <QRCodeSVG value={verifyUrl} size={132} bgColor="#ffffff" fgColor="#000000" level="M" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-lg font-bold">{localize(credential.service.name)}</h2>
          <StatusBadge kind="credential" value={credential.status} />
        </div>
        {inactive && (
          <p role="note" className="flex items-center gap-1 text-sm text-danger dark:text-[#ff8a80]">
            <span className="material-icons" aria-hidden="true">warning</span>
            {t(`card.${credential.status}`)}
          </p>
        )}
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">{t("card.number")}</dt>
            <dd className="font-mono font-semibold" dir="ltr">{credential.number}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("card.holder")}</dt>
            <dd className="font-semibold" dir="auto">{credential.holderName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("card.issuedAt")}</dt>
            <dd className="font-semibold">{formatDate(credential.issuedAt, i18n.language)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{t("card.expiresAt")}</dt>
            <dd className="font-semibold">{credential.expiresAt ? formatDate(credential.expiresAt, i18n.language) : t("card.noExpiry")}</dd>
          </div>
        </dl>
        <button type="button" className="btn btn-secondary btn-sm" onClick={copyLink}>
          <span className="material-icons" aria-hidden="true">link</span>
          {t("card.copyLink")}
        </button>
      </div>
    </article>
  );
}

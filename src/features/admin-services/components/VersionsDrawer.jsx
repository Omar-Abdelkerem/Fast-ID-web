import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { getServiceVersion } from "../api";
import DefinitionView from "./DefinitionView";

function VersionDetails({ serviceId, version }) {
  const { t } = useTranslation("admin-services");
  const query = useQuery({
    queryKey: ["admin", "services", serviceId, "versions", version],
    queryFn: () => getServiceVersion(serviceId, version),
  });

  if (query.isLoading) return <Spinner />;
  if (query.isError) return <p className="text-danger text-sm">{getErrorMessage(query.error, t)}</p>;
  return <DefinitionView definition={query.data} />;
}

// Side drawer listing versions 1..publishedVersion (newest first)
export default function VersionsDrawer({ open, onClose, serviceId, publishedVersion }) {
  const { t } = useTranslation("admin-services");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const versions = Array.from({ length: publishedVersion }, (_, i) => publishedVersion - i);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <aside role="dialog" aria-modal="true" aria-label={t("versions.title")} className="h-full w-full max-w-md overflow-y-auto bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-lg">{t("versions.title")}</h2>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>{t("versions.close")}</button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {versions.map((version) => (
            <button key={version} className={`btn btn-sm ${selected === version ? "btn-primary" : "btn-secondary"}`} aria-pressed={selected === version} onClick={() => setSelected(version)}>
              v{version}{version === publishedVersion ? ` · ${t("versions.live")}` : ""}
            </button>
          ))}
        </div>
        {selected ? <VersionDetails serviceId={serviceId} version={selected} /> : <p className="text-sm text-muted">{t("versions.pick")}</p>}
      </aside>
    </div>
  );
}

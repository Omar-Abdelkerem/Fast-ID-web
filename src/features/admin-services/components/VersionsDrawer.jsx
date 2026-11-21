import { useEffect, useRef, useState } from "react";
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
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    drawerRef.current?.focus();

    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !drawerRef.current) return;
      // keep Tab inside the drawer
      const focusable = drawerRef.current.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === drawerRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus(); // give focus back to the button that opened the drawer
    };
  }, [open, onClose]);

  if (!open) return null;
  const versions = Array.from({ length: publishedVersion }, (_, i) => publishedVersion - i);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <aside ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("versions.title")} className="h-full w-full max-w-md overflow-y-auto bg-white p-4 shadow-xl">
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

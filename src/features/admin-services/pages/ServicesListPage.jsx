import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Spinner, EmptyState, ErrorState, ConfirmDialog, useLocalized, useToast } from "@/components";
import { getErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { getAdminServices, publishService, unpublishService, deleteService } from "../api";
import AvailabilityBadge from "../components/AvailabilityBadge";

const actionFunctions = {
  publish: publishService,
  unpublish: unpublishService,
  delete: deleteService,
};

export default function ServicesListPage() {
  const { t, i18n } = useTranslation("admin-services");
  const { localize } = useLocalized();
  const toast = useToast();
  const queryClient = useQueryClient();

  // the service + action waiting for the admin's confirmation, e.g. { service, action: "publish" }
  const [pending, setPending] = useState(null);

  const servicesQuery = useQuery({ queryKey: ["admin", "services"], queryFn: getAdminServices });

  const actionMutation = useMutation({
    mutationFn: ({ service, action }) => actionFunctions[action](service.id),
    onSuccess: (_data, { action }) => {
      toast.success(t(`toast.${action}`));
      queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setPending(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, t));
      // the list may be stale (service deleted or state changed), so reload it
      queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      setPending(null);
    },
  });

  const services = servicesQuery.data || [];

  return (
    <div>
      <PageHeader
        title={t("list.title")}
        subtitle={t("list.subtitle")}
        actions={<Link to="/admin/services/new" className="btn btn-primary">{t("list.newService")}</Link>}
      />

      {servicesQuery.isLoading && <Spinner />}
      {servicesQuery.isError && <ErrorState error={servicesQuery.error} onRetry={servicesQuery.refetch} />}

      {servicesQuery.isSuccess && services.length === 0 && (
        <EmptyState
          title={t("list.emptyTitle")}
          text={t("list.emptyText")}
          action={<Link to="/admin/services/new" className="btn btn-primary">{t("list.newService")}</Link>}
        />
      )}

      {servicesQuery.isSuccess && services.length > 0 && (
        <div className="card overflow-x-auto p-0">
          <table className="table">
            <thead>
              <tr>
                <th>{t("list.columns.id")}</th>
                <th>{t("list.columns.name")}</th>
                <th>{t("list.columns.category")}</th>
                <th>{t("list.columns.availability")}</th>
                <th>{t("list.columns.version")}</th>
                <th>{t("list.columns.changes")}</th>
                <th>{t("list.columns.updatedAt")}</th>
                <th>{t("list.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td dir="ltr" className="font-mono text-xs">{service.id}</td>
                  <td className="font-semibold">{localize(service.draft.name)}</td>
                  <td>{t(`category.${service.category}`)}</td>
                  <td><AvailabilityBadge value={service.availability} /></td>
                  <td>{service.publishedVersion ? `v${service.publishedVersion}` : "—"}</td>
                  <td>
                    {/* text + icon, never colour alone */}
                    {service.hasUnpublishedChanges ? <span className="text-warning font-semibold">● {t("list.hasChanges")}</span> : <span className="text-muted">—</span>}
                  </td>
                  <td>{formatDate(service.updatedAt, i18n.language)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/services/${service.id}`} className="btn btn-secondary btn-sm">{t("actions.edit")}</Link>
                      <button className="btn btn-primary btn-sm" onClick={() => setPending({ service, action: "publish" })}>
                        {t("actions.publish")}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={service.availability !== "PUBLISHED"}
                        onClick={() => setPending({ service, action: "unpublish" })}
                      >
                        {t("actions.unpublish")}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        disabled={service.availability !== "DRAFT"}
                        title={service.availability !== "DRAFT" ? t("list.deleteDisabled") : undefined}
                        onClick={() => setPending({ service, action: "delete" })}
                      >
                        {t("actions.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending ? t(`confirm.${pending.action}.title`) : ""}
        message={pending ? t(`confirm.${pending.action}.message`, { name: localize(pending.service.draft.name) }) : ""}
        confirmText={pending ? t(`actions.${pending.action}`) : ""}
        danger={pending?.action === "delete" || pending?.action === "unpublish"}
        isLoading={actionMutation.isPending}
        onConfirm={() => actionMutation.mutate(pending)}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader, Spinner, ErrorState, useToast } from "@/components";
import { applyServerErrors, getErrorMessage } from "@/lib/errors";
import { getAdminService, createService, updateService } from "../api";
import { makeServiceSchema, emptyFormValues, fromDraft, toBody, getChangedKeys, serverPathToFormPath, parseRow } from "../schema";
import AvailabilityBadge from "../components/AvailabilityBadge";
import Icon from "../components/Icon";
import BasicsSection from "../components/BasicsSection";
import RequiredDocumentsSection from "../components/RequiredDocumentsSection";
import FormFieldsSection from "../components/FormFieldsSection";
import { FieldsPreview } from "../components/DefinitionView";
import VersionsDrawer from "../components/VersionsDrawer";
import useServiceAction from "../components/useServiceAction";

// body of the form once the service (if any) has loaded
function ServiceForm({ service }) {
  const { t } = useTranslation("admin-services");
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isNew = !service;

  const initialValues = useMemo(() => (service ? fromDraft(service.id, service.draft) : emptyFormValues), [service]);
  const methods = useForm({ resolver: zodResolver(makeServiceSchema(isNew)), defaultValues: initialValues });
  const { handleSubmit, setError, control } = methods;

  // problems the server reported, shown in a summary and marked on their rows
  const [serverProblems, setServerProblems] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const { request, dialog } = useServiceAction();

  const currentValues = useWatch({ control });
  // the body that would be sent, and only the keys that changed since loading
  const changedKeys = useMemo(() => {
    if (isNew) return {};
    try {
      const current = toBody({ ...initialValues, ...currentValues });
      return getChangedKeys(current, toBody(initialValues));
    } catch {
      return { invalid: true }; // half typed numbers etc: still counts as a change
    }
  }, [currentValues, initialValues, isNew]);
  const hasChanges = isNew || Object.keys(changedKeys).length > 0;

  // warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!hasChanges || isNew) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasChanges, isNew]);

  const saveMutation = useMutation({
    mutationFn: (values) => (isNew ? createService({ id: values.id, ...toBody(values) }) : updateService(service.id, changedKeys)),
    onSuccess: (saved) => {
      toast.success(t(isNew ? "toast.created" : "toast.saved"));
      setServerProblems([]);
      queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
      if (isNew) navigate(`/admin/services/${saved.id}`);
    },
    onError: (error) => {
      // turn "formSchema.fields[2].options" into the form's own path and show it on the input
      const details = Array.isArray(error.details) ? error.details.map((d) => ({ ...d, field: d.field ? serverPathToFormPath(d.field) : d.field })) : error.details;
      const field = error.field ? serverPathToFormPath(error.field) : error.field;
      const mapped = applyServerErrors({ ...error, field, details }, setError, t);
      if (error.code === "INVALID_FORM_SCHEMA" && Array.isArray(error.details)) setServerProblems(error.details);
      if (!mapped || error.code === "INVALID_FORM_SCHEMA") toast.error(getErrorMessage(error, t));
      if (error.code === "SERVICE_NOT_FOUND") queryClient.invalidateQueries({ queryKey: ["admin", "services"] });
    },
  });

  const badRows = (list) => new Set(serverProblems.map((p) => parseRow(p.field)).filter((row) => row && row.list === list).map((row) => row.index));

  const previewFields = useMemo(() => {
    try {
      return toBody({ ...emptyFormValues, ...currentValues }).formSchema.fields.filter((f) => f.key);
    } catch {
      return [];
    }
  }, [currentValues]);

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));
  const dirtyBlocksPublish = !isNew && Object.keys(changedKeys).length > 0;

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} noValidate className="space-y-4 pb-24">
        {serverProblems.length > 0 && (
          <div role="alert" className="card border-danger border-2">
            <p className="font-bold text-danger">{t("editor.serverProblems")}</p>
            <ul className="mt-2 list-disc ps-5 text-sm">
              {serverProblems.map((problem, i) => (
                <li key={i}><span dir="ltr" className="font-mono">{problem.field}</span> — {t(`errors.${problem.code}`, { defaultValue: problem.code })}</li>
              ))}
            </ul>
          </div>
        )}

        <BasicsSection isNew={isNew} />
        <RequiredDocumentsSection badRows={badRows("requiredDocuments")} />
        <FormFieldsSection badRows={badRows("fields")} />

        {showPreview && (
          <section className="card" aria-label={t("editor.preview")}>
            <h2 className="font-bold text-lg mb-2">{t("editor.preview")}</h2>
            <FieldsPreview fields={previewFields} />
          </section>
        )}

        {/* sticky bar */}
        <div className="fixed bottom-0 start-56 end-0 z-30 border-t border-line bg-white p-3">
          <div className="flex flex-wrap items-center gap-3">
            {service && (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <AvailabilityBadge value={service.availability} />
                <span>{t("editor.publishedVersion")}: {service.publishedVersion ? `v${service.publishedVersion}` : "—"}</span>
                {(service.hasUnpublishedChanges || dirtyBlocksPublish) && <span className="text-warning font-semibold"><Icon name="edit_note" /> {t("list.hasChanges")}</span>}
              </div>
            )}
            <div className="ms-auto flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary" aria-pressed={showPreview} onClick={() => setShowPreview((v) => !v)}>{t("editor.preview")}</button>
              {service?.publishedVersion && <button type="button" className="btn btn-secondary" onClick={() => setShowVersions(true)}>{t("versions.title")}</button>}
              {service && (
                <>
                  <button type="button" className="btn btn-secondary" disabled={service.availability !== "PUBLISHED"} onClick={() => request(service, "unpublish")}>{t("actions.unpublish")}</button>
                  <button type="button" className="btn btn-secondary" disabled={dirtyBlocksPublish} title={dirtyBlocksPublish ? t("editor.saveFirst") : undefined} onClick={() => request(service, "publish")}>{t("actions.publish")}</button>
                </>
              )}
              <button type="submit" className="btn btn-primary" disabled={!hasChanges || saveMutation.isPending}>
                {saveMutation.isPending ? t("editor.saving") : t(isNew ? "editor.create" : "editor.save")}
              </button>
            </div>
          </div>
        </div>
      </form>

      {dialog}
      {service?.publishedVersion && (
        <VersionsDrawer open={showVersions} onClose={() => setShowVersions(false)} serviceId={service.id} publishedVersion={service.publishedVersion} />
      )}
    </FormProvider>
  );
}

export default function ServiceEditorPage() {
  const { serviceId } = useParams();
  const { t } = useTranslation("admin-services");
  const isNew = !serviceId;

  const serviceQuery = useQuery({
    queryKey: ["admin", "services", serviceId],
    queryFn: () => getAdminService(serviceId),
    enabled: !isNew,
    refetchOnWindowFocus: false, // do not replace what the admin is typing
  });

  if (!isNew && serviceQuery.isLoading) return <Spinner />;
  if (!isNew && serviceQuery.isError) {
    const notFound = serviceQuery.error.code === "SERVICE_NOT_FOUND";
    return (
      <div className="space-y-3">
        <ErrorState error={serviceQuery.error} onRetry={notFound ? undefined : serviceQuery.refetch} />
        <div className="text-center"><Link to="/admin/services" className="link">{t("editor.backToList")}</Link></div>
      </div>
    );
  }

  const service = serviceQuery.data;
  return (
    <div>
      <PageHeader
        title={isNew ? t("editor.newTitle") : t("editor.editTitle", { id: service.id })}
        actions={<Link to="/admin/services" className="btn btn-secondary">{t("editor.backToList")}</Link>}
      />
      {/* key: reload the form from the server copy after every save / publish */}
      <ServiceForm key={service ? service.updatedAt : "new"} service={service} />
    </div>
  );
}

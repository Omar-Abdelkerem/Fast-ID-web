import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Spinner,
  useLocalized,
  useToast,
} from "@/components";
import { getErrorMessage } from "@/lib/errors";
import {
  createDraftApplication,
  deleteDraftApplication,
  findActiveApplications,
  getApplication,
  getService,
  patchApplication,
  payApplicationMock,
  submitApplication,
} from "../api";
import WizardStepper from "../components/WizardStepper";
import DynamicForm from "../components/DynamicForm";
import DocumentsStep from "../components/DocumentsStep";
import DeliveryAddressStep from "../components/DeliveryAddressStep";
import ReviewSubmitStep from "../components/ReviewSubmitStep";
import "../theme.css";

function parseStepFromHash() {
  const match = window.location.hash.match(/^#step-([1-4])$/);
  return match ? Number(match[1]) : 1;
}

export default function ApplyPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation("apply");
  const { localize } = useLocalized();
  const toast = useToast();

  const formRef = useRef(null);
  const deliveryRef = useRef(null);

  const [step, setStep] = useState(parseStepFromHash);
  const [service, setService] = useState(null);
  const [application, setApplication] = useState(null);
  const [bootStatus, setBootStatus] = useState("loading");
  const [bootError, setBootError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [highlightedDocKeys, setHighlightedDocKeys] = useState([]);
  const [submitFieldError, setSubmitFieldError] = useState(null);

  useEffect(() => {
    const onHashChange = () => setStep(parseStepFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const updateStep = useCallback((nextStep) => {
    setStep(nextStep);
    window.location.hash = `step-${nextStep}`;
  }, []);

  const bootstrap = useCallback(async () => {
    setBootStatus("loading");
    setBootError(null);

    try {
      const loadedService = await getService(serviceId);
      setService(loadedService);

      const resolveExisting = async () => {
        const activeList = await findActiveApplications(serviceId);
        if (activeList.length > 0) {
          const existing = activeList[0];
          if (existing.status === "DRAFT") {
            const fullDraft = await getApplication(existing.id);
            setApplication(fullDraft);
            setBootStatus("ready");
            return true;
          }
          navigate(`/applications/${existing.id}`, { replace: true });
          return true;
        }
        return false;
      };

      const handled = await resolveExisting();
      if (handled) return;

      try {
        const created = await createDraftApplication(serviceId);
        setApplication(created);
        setBootStatus("ready");
        queryClient.invalidateQueries({ queryKey: ["applications"] });
      } catch (createErr) {
        if (createErr.code === "ACTIVE_APPLICATION_EXISTS") {
          const retried = await resolveExisting();
          if (retried) return;
        }
        if (createErr.code === "SERVICE_NOT_AVAILABLE") {
          setBootStatus("unavailable");
          return;
        }
        throw createErr;
      }
    } catch (err) {
      if (err.code === "SERVICE_NOT_FOUND") {
        setBootStatus("not_found");
        return;
      }
      if (err.code === "SERVICE_NOT_AVAILABLE") {
        setBootStatus("unavailable");
        return;
      }
      setBootError(err);
      setBootStatus("error");
    }
  }, [serviceId, navigate, queryClient]);

  useEffect(() => {
    // loads the service and the draft once; its state updates happen after awaited requests
    bootstrap();
  }, [bootstrap]);

  const patchMutation = useMutation({
    mutationFn: ({ id, payload }) => patchApplication(id, payload),
    onSuccess: (updatedApp) => {
      // A PATCH response can predate a concurrently completed document upload.
      // Keep the latest locally known attachments instead of undoing the UI
      // update made by onAttachmentsChange.
      setApplication((prev) => ({
        ...updatedApp,
        attachments: prev?.id === updatedApp.id
          ? prev.attachments || updatedApp.attachments
          : updatedApp.attachments,
      }));
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const payMutation = useMutation({
    mutationFn: (id) => payApplicationMock(id),
    onSuccess: (updatedApp) => {
      setApplication(updatedApp);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id) => submitApplication(id),
    onSuccess: (submittedApp) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(t("review.toasts.submitted"));
      navigate(`/applications/${submittedApp.id}`, { replace: true });
    },
  });

  const discardMutation = useMutation({
    mutationFn: (id) => deleteDraftApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success(t("review.toasts.discarded"));
      navigate("/services", { replace: true });
    },
  });

  function handleNotEditable() {
    toast.error(t("toasts.notEditable"));
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    if (application?.id) {
      navigate(`/applications/${application.id}`, { replace: true });
    }
  }

  async function handleSaveData(changedData, { showToast = false } = {}) {
    if (!application) return;
    setSaveStatus("idle");

    try {
      await patchMutation.mutateAsync({ id: application.id, payload: { data: changedData } });
      if (showToast) {
        toast.success(t("toasts.draftSaved"));
      }
    } catch (err) {
      if (err.code === "APPLICATION_NOT_EDITABLE") {
        handleNotEditable();
        throw err;
      }
      if (err.code === "SERVICE_NOT_AVAILABLE") {
        setBootStatus("unavailable");
        throw err;
      }
      toast.error(getErrorMessage(err, t));
      throw err;
    }
  }

  async function handleSaveDeliveryAddress(changedAddress, { showToast = false } = {}) {
    if (!application) return;

    try {
      await patchMutation.mutateAsync({
        id: application.id,
        payload: { deliveryAddress: changedAddress },
      });
      if (showToast) {
        toast.success(t("delivery.toasts.saved"));
      }
    } catch (err) {
      if (err.code === "APPLICATION_NOT_EDITABLE") {
        handleNotEditable();
        throw err;
      }
      if (err.code === "SERVICE_NOT_AVAILABLE") {
        setBootStatus("unavailable");
        throw err;
      }
      toast.error(getErrorMessage(err, t));
      throw err;
    }
  }

  function handleAttachmentsChange(nextAttachments) {
    // Functional updates are essential when two uploads finish close together.
    setApplication((prev) =>
      prev
        ? {
            ...prev,
            attachments:
              typeof nextAttachments === "function"
                ? nextAttachments(prev.attachments || [])
                : nextAttachments,
          }
        : prev
    );
    queryClient.invalidateQueries({ queryKey: ["applications"] });
  }

  async function handleSubmitApplication() {
    if (!application) return;
    setHighlightedDocKeys([]);
    setSubmitFieldError(null);

    try {
      await submitMutation.mutateAsync(application.id);
    } catch (err) {
      if (err.code === "APPLICATION_NOT_EDITABLE") {
        handleNotEditable();
        return;
      }
      if (err.code === "SERVICE_NOT_AVAILABLE") {
        setBootStatus("unavailable");
        return;
      }

      toast.error(getErrorMessage(err, t));

      if (err.code === "MISSING_REQUIRED_DOCUMENTS") {
        const missingKeys = (err.details || [])
          .map((d) => d.field?.replace(/^attachments\./, ""))
          .filter(Boolean);
        setHighlightedDocKeys(missingKeys);
        updateStep(2);
        return;
      }

      if (err.code === "MISSING_REQUIRED_FIELDS" || err.code === "VALIDATION_ERROR") {
        // Keep the complete translated field-error payload for the form that
        // will mount after the step changes, instead of only navigating.
        setSubmitFieldError(err);
        const firstField = err.details?.[0]?.field || err.field || "";
        if (firstField.startsWith("deliveryAddress.")) {
          updateStep(3);
        } else {
          updateStep(1);
        }
        return;
      }

      throw err;
    }
  }

  async function handleStepChange(targetStep) {
    if (targetStep === step) return;

    if (step === 1 && formRef.current) {
      const okToMove = await formRef.current.saveBeforeStepChange(targetStep);
      if (!okToMove) return;
    }

    if (step === 3 && deliveryRef.current) {
      const okToMove = await deliveryRef.current.saveBeforeStepChange(targetStep);
      if (!okToMove) return;
    }

    setSubmitFieldError(null);
    updateStep(targetStep);
  }

  if (bootStatus === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-[#68769D]">{t("loading")}</p>
      </div>
    );
  }

  if (bootStatus === "not_found") {
    return (
      <EmptyState
        title={t("states.serviceNotFoundTitle")}
        text={t("states.serviceNotFoundText")}
        action={
          <Link to="/services" className="btn btn-primary">
            {t("actions.backToServices")}
          </Link>
        }
      />
    );
  }

  if (bootStatus === "unavailable") {
    return (
      <EmptyState
        title={t("states.serviceUnavailableTitle")}
        text={t("states.serviceUnavailableText")}
        action={
          <Link to="/services" className="btn btn-primary">
            {t("actions.backToServices")}
          </Link>
        }
      />
    );
  }

  if (bootStatus === "error") {
    return <ErrorState error={bootError} onRetry={bootstrap} />;
  }

  const isBusy =
    patchMutation.isPending ||
    payMutation.isPending ||
    submitMutation.isPending ||
    discardMutation.isPending;

  return (
    <div className="fid-theme fid-apply mx-auto max-w-5xl">
      <PageHeader
        title={localize(service.name)}
        subtitle={application?.applicationNumber}
      />

      <WizardStepper
        currentStep={step}
        onStepChange={handleStepChange}
        disabled={isBusy}
      />

      <div className="card">
        {step === 1 && (
          <DynamicForm
            ref={formRef}
            fields={service.formSchema?.fields || []}
            savedData={application?.data || {}}
            onSave={handleSaveData}
            isSaving={patchMutation.isPending}
            saveStatus={saveStatus}
            submitError={submitFieldError}
          />
        )}

        {step === 2 && (
          <DocumentsStep
            applicationId={application.id}
            requiredDocuments={service.requiredDocuments || []}
            attachments={application.attachments || []}
            highlightedKeys={highlightedDocKeys}
            onAttachmentsChange={handleAttachmentsChange}
            onNotEditable={handleNotEditable}
          />
        )}

        {step === 3 && (
          <DeliveryAddressStep
            ref={deliveryRef}
            savedAddress={application.deliveryAddress}
            onSave={handleSaveDeliveryAddress}
            isSaving={patchMutation.isPending}
            submitError={submitFieldError}
          />
        )}

        {step === 4 && (
          <ReviewSubmitStep
            service={service}
            application={application}
            onEditStep={(target) => updateStep(target)}
            onPayMock={() => payMutation.mutateAsync(application.id)}
            isPaying={payMutation.isPending}
            onSubmit={handleSubmitApplication}
            isSubmitting={submitMutation.isPending}
            onDiscard={() => discardMutation.mutateAsync(application.id)}
            isDiscarding={discardMutation.isPending}
            onNotEditable={handleNotEditable}
          />
        )}

        <div className="mt-6 flex items-center justify-between border-t border-[#D9E1F4] pt-4">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={step === 1 || isBusy}
            onClick={() => handleStepChange(step - 1)}
          >
            {t("actions.previous")}
          </button>

          {step < 4 && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={isBusy}
              onClick={() => handleStepChange(step + 1)}
            >
              {t("actions.next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

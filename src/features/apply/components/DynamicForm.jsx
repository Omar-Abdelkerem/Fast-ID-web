import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { FormField, useLocalized } from "@/components";
import { applyServerErrors } from "@/lib/errors";
import { getStepServerError } from "../utils/serverFieldErrors";
import {
  buildDefaultValues,
  buildFormSchema,
  getChangedData,
} from "../utils/buildFormSchema";

const AUTOSAVE_DELAY_MS = 1500;

const DynamicForm = forwardRef(function DynamicForm(
  { fields, savedData, onSave, isSaving, saveStatus, submitError },
  ref
) {
  const { t } = useTranslation("apply");
  const { localize } = useLocalized();
  const autosaveTimerRef = useRef(null);
  const saveQueueRef = useRef(null);
  const lastSavedRef = useRef(savedData || {});

  // Only advance this baseline after a queued PATCH succeeds. A delayed
  // parent re-render must not roll it back to an older server response.

  const draftSchema = useMemo(
    () => buildFormSchema(fields, t, { enforceRequired: false }),
    [fields, t]
  );

  const defaultValues = useMemo(
    () => buildDefaultValues(fields, savedData),
    [fields, savedData]
  );

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setError,
    reset,
    // Subscribe to dirtyFields so keepDirtyValues preserves in-flight edits.
    formState: { errors, dirtyFields },
  } = useForm({
    defaultValues,
    resolver: zodResolver(draftSchema),
    mode: "onBlur",
  });

  useEffect(() => {
    const unsaved = getChangedData(fields, getValues(), savedData || {});
    // A response can arrive while the user is typing. Preserve values edited
    // since that request began; only update the saved baseline from the API.
    reset(
      defaultValues,
      Object.keys(unsaved).length > 0
        ? { keepDirtyValues: true, keepErrors: false }
        : { keepErrors: false }
    );
  }, [defaultValues, fields, savedData, reset, getValues]);

  const fieldMap = useMemo(() => {
    const map = {};
    for (const field of fields || []) {
      map[`data.${field.key}`] = field.key;
    }
    return map;
  }, [fields]);

  useEffect(() => {
    const stepError = getStepServerError(submitError, "data.");
    if (stepError) applyServerErrors(stepError, setError, t, { fieldMap });
  }, [submitError, setError, t, fieldMap]);

  async function saveIfChanged({ showToast = false, enforceRequired = false } = {}) {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    // Each call waits for the previous call in the chain, not just the first
    // active request. Three or more rapid saves can never overlap.
    const previousSave = saveQueueRef.current;
    const pendingSave = (async () => {
      if (previousSave) {
        try {
          await previousSave;
        } catch {
          // An earlier failed save must not block newer edits.
        }
      }

      const currentValues = getValues();
      const schemaToUse = enforceRequired
        ? buildFormSchema(fields, t, { enforceRequired: true })
        : draftSchema;
      const parsed = schemaToUse.safeParse(currentValues);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (key) setError(String(key), { type: "manual", message: issue.message });
        }
        return false;
      }

      const changed = getChangedData(fields, currentValues, lastSavedRef.current);
      if (Object.keys(changed).length === 0) return true;

      try {
        await onSave(changed, { showToast });
        lastSavedRef.current = { ...lastSavedRef.current, ...changed };
        return true;
      } catch (err) {
        applyServerErrors(err, setError, t, { fieldMap });
        return false;
      }
    })();

    saveQueueRef.current = pendingSave;
    try {
      return await pendingSave;
    } finally {
      if (saveQueueRef.current === pendingSave) saveQueueRef.current = null;
    }
  }

  useImperativeHandle(ref, () => ({
    saveBeforeStepChange: (targetStep) =>
      saveIfChanged({ showToast: false, enforceRequired: targetStep === 4 }),
  }));

  // P1: Debounced autosave 1.5s after the user stops typing
  // Reading dirtyFields subscribes RHF to preserve edits on a background reset.
  void dirtyFields;
  const watchedValues = watch();
  const hasUnsavedChanges =
    Object.keys(getChangedData(fields, watchedValues, savedData || {})).length > 0;
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      saveIfChanged({ showToast: false, enforceRequired: false });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedValues, hasUnsavedChanges]);

  const onManualSubmit = handleSubmit(async () => {
    await saveIfChanged({ showToast: true, enforceRequired: false });
  });

  if (!fields || fields.length === 0) {
    return <p className="text-sm text-[#68769D]">{t("form.noFields")}</p>;
  }

  return (
    <form onSubmit={onManualSubmit} noValidate className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D9E1F4] pb-3">
        <p className="text-sm text-[#68769D]">{t("form.requiredHint")}</p>
        <span aria-live="polite" className="text-xs font-medium text-[#68769D]">
          {hasUnsavedChanges
            ? isSaving
              ? t("actions.saving")
              : t("actions.unsaved")
            : isSaving
            ? t("actions.saving")
            : saveStatus === "saved"
            ? t("actions.saved")
            : ""}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {fields.map((field) => {
          const inputId = `field-${field.key}`;
          const label = localize(field.label);
          const hint = field.helpText ? localize(field.helpText) : undefined;
          const errorMessage = errors[field.key]?.message;
          const isFullWidth = field.type === "TEXTAREA" || field.type === "CHECKBOX";

          if (field.type === "CHECKBOX") {
            return (
              <div key={field.key} className="md:col-span-2">
                <label htmlFor={inputId} className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    id={inputId}
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-[#D9E1F4] text-[#4765F4] focus:ring-[#4765F4]"
                    {...register(field.key)}
                  />
                  <span>
                    <span className="text-sm font-medium text-[#252C68]">
                      {label}
                      {field.required && <span className="ms-1 text-danger">*</span>}
                    </span>
                    {hint && <span className="block text-xs text-[#68769D]">{hint}</span>}
                  </span>
                </label>
                {errorMessage && <p className="field-error mt-1">{errorMessage}</p>}
              </div>
            );
          }

          return (
            <div key={field.key} className={isFullWidth ? "md:col-span-2" : ""}>
              <FormField
                label={label}
                htmlFor={inputId}
                hint={hint}
                error={errorMessage}
                required={field.required}
              >
                {field.type === "TEXT" && (
                  <input
                    id={inputId}
                    type="text"
                    className="input"
                    aria-invalid={Boolean(errorMessage)}
                    {...register(field.key)}
                  />
                )}

                {field.type === "TEXTAREA" && (
                  <textarea
                    id={inputId}
                    rows={4}
                    className="textarea"
                    aria-invalid={Boolean(errorMessage)}
                    {...register(field.key)}
                  />
                )}

                {field.type === "NUMBER" && (
                  <input
                    id={inputId}
                    type="number"
                    step="any"
                    className="input"
                    aria-invalid={Boolean(errorMessage)}
                    {...register(field.key)}
                  />
                )}

                {field.type === "DATE" && (
                  <input
                    id={inputId}
                    type="date"
                    min={field.validation?.minDate}
                    max={field.validation?.maxDate}
                    className="input"
                    aria-invalid={Boolean(errorMessage)}
                    {...register(field.key)}
                  />
                )}

                {field.type === "SELECT" && (
                  <select
                    id={inputId}
                    className="select"
                    aria-invalid={Boolean(errorMessage)}
                    {...register(field.key)}
                  >
                    <option value="">{t("form.selectPlaceholder")}</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {localize(opt.label)}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end border-t border-[#D9E1F4] pt-4">
        <button type="submit" className="btn btn-secondary" disabled={isSaving}>
          {isSaving ? t("actions.saving") : t("actions.saveDraft")}
        </button>
      </div>
    </form>
  );
});

export default DynamicForm;

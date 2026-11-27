import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ErrorState, FormField, Spinner, useLocalized } from "@/components";
import { useAuth } from "@/lib/auth";
import { applyServerErrors } from "@/lib/errors";
import { getStepServerError } from "../utils/serverFieldErrors";
import { getGovernorates } from "../api";

const EGYPT_PHONE_REGEX = /^(\+?20)?0?1[0125][0-9]{8}$/;

const FIELD_MAP = {
  "deliveryAddress.governorate": "governorate",
  "deliveryAddress.city": "city",
  "deliveryAddress.addressLine": "addressLine",
  "deliveryAddress.phone": "phone",
  "deliveryAddress.notes": "notes",
};

function normalizeEgyptPhone(raw) {
  const digits = String(raw || "").trim().replace(/[\s-]/g, "");
  if (digits.startsWith("+20")) return `0${digits.slice(3)}`;
  if (digits.startsWith("20") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
}

const DeliveryAddressStep = forwardRef(function DeliveryAddressStep(
  { savedAddress, onSave, isSaving, submitError },
  ref
) {
  const { t } = useTranslation("apply");
  const { localize } = useLocalized();
  const { user } = useAuth();

  const {
    data: governorates = [],
    isLoading: isLoadingGovs,
    error: govsError,
    refetch: refetchGovs,
  } = useQuery({
    queryKey: ["reference", "governorates"],
    queryFn: getGovernorates,
    staleTime: 1000 * 60 * 60,
  });

  const schema = useMemo(
    () =>
      z.object({
        governorate: z.string().trim().min(1, t("delivery.validation.governorateRequired")),
        city: z
          .string()
          .trim()
          .min(2, t("delivery.validation.cityMin"))
          .max(60, t("delivery.validation.cityMax")),
        addressLine: z
          .string()
          .trim()
          .min(5, t("delivery.validation.addressMin"))
          .max(200, t("delivery.validation.addressMax")),
        phone: z
          .string()
          .trim()
          .refine((val) => EGYPT_PHONE_REGEX.test(val.replace(/[\s-]/g, "")), {
            message: t("delivery.validation.phoneInvalid"),
          }),
        notes: z
          .string()
          .trim()
          .max(300, t("delivery.validation.notesMax"))
          .optional()
          .or(z.literal("")),
      }),
    [t]
  );

  const defaultValues = useMemo(
    () => ({
      governorate: savedAddress?.governorate || "",
      city: savedAddress?.city || "",
      addressLine: savedAddress?.addressLine || "",
      phone: savedAddress?.phone || user?.phone || "",
      notes: savedAddress?.notes || "",
    }),
    [savedAddress, user?.phone]
  );

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    reset,
    formState: { errors, dirtyFields },
  } = useForm({
    defaultValues,
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  // Subscribe to dirty fields so a slow address PATCH does not erase edits
  // the user typed while that save was still in flight.
  void dirtyFields;
  useEffect(() => {
    reset(defaultValues, { keepDirtyValues: true, keepErrors: false });
  }, [defaultValues, reset]);

  useEffect(() => {
    const stepError = getStepServerError(submitError, "deliveryAddress.");
    if (stepError) applyServerErrors(stepError, setError, t, { fieldMap: FIELD_MAP });
  }, [submitError, setError, t]);

  function buildChangedAddress(values, { validateAll = true } = {}) {
    const normalized = {
      governorate: values.governorate.trim(),
      city: values.city.trim(),
      addressLine: values.addressLine.trim(),
      phone: normalizeEgyptPhone(values.phone),
      notes: values.notes?.trim() ? values.notes.trim() : null,
    };

    const changed = {};
    for (const [key, nextVal] of Object.entries(normalized)) {
      const prevVal = savedAddress?.[key] ?? null;
      // When navigating backwards, an empty unsaved field is not a valid
      // PATCH value. Leave the value in the form, but don't send it.
      // Existing saved values are also left unchanged if cleared on a back
      // navigation; users can replace them with a valid value later.
      if (!validateAll && (nextVal === "" || (nextVal === null && key !== "notes"))) {
        continue;
      }
      if (nextVal !== prevVal) {
        changed[key] = nextVal;
      }
    }
    return changed;
  }

  async function saveAddress({ showToast = false, validateAll = true } = {}) {
    const values = getValues();

    if (validateAll) {
      const parsed = schema.safeParse(values);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (key) {
            setError(String(key), { type: "manual", message: issue.message });
          }
        }
        return false;
      }
    }

    const changed = buildChangedAddress(values, { validateAll });
    // Even an incomplete address can be saved while leaving a step, but all
    // fields that ARE sent must satisfy the backend's partial-PATCH rules.
    if (!validateAll && Object.keys(changed).length > 0) {
      const result = schema.partial().safeParse(changed);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = issue.path[0];
          if (key) setError(String(key), { type: "manual", message: issue.message });
        }
        return false;
      }
    }
    if (Object.keys(changed).length === 0) {
      return true;
    }

    try {
      await onSave(changed, { showToast });
      return true;
    } catch (err) {
      applyServerErrors(err, setError, t, { fieldMap: FIELD_MAP });
      return false;
    }
  }

  useImperativeHandle(ref, () => ({
    saveBeforeStepChange: (targetStep) =>
      saveAddress({ showToast: false, validateAll: targetStep === 4 }),
  }));

  const onSubmit = handleSubmit(async () => {
    await saveAddress({ showToast: true, validateAll: true });
  });

  if (isLoadingGovs) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (govsError) {
    return <ErrorState error={govsError} onRetry={refetchGovs} />;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="border-b border-[#D9E1F4] pb-3">
        <h2 className="text-lg font-bold text-[#252C68]">{t("delivery.title")}</h2>
        <p className="mt-1 text-sm text-[#68769D]">{t("delivery.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormField
          label={t("delivery.governorate")}
          htmlFor="delivery-governorate"
          error={errors.governorate?.message}
          required
        >
          <select
            id="delivery-governorate"
            className="select"
            aria-invalid={Boolean(errors.governorate)}
            {...register("governorate")}
          >
            <option value="">{t("delivery.governoratePlaceholder")}</option>
            {governorates.map((gov) => (
              <option key={gov.code} value={gov.code}>
                {localize(gov.name)}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("delivery.city")}
          htmlFor="delivery-city"
          error={errors.city?.message}
          required
        >
          <input
            id="delivery-city"
            type="text"
            className="input"
            aria-invalid={Boolean(errors.city)}
            {...register("city")}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField
            label={t("delivery.addressLine")}
            htmlFor="delivery-address-line"
            hint={t("delivery.addressHint")}
            error={errors.addressLine?.message}
            required
          >
            <input
              id="delivery-address-line"
              type="text"
              className="input"
              aria-invalid={Boolean(errors.addressLine)}
              {...register("addressLine")}
            />
          </FormField>
        </div>

        <FormField
          label={t("delivery.phone")}
          htmlFor="delivery-phone"
          hint={t("delivery.phoneHint")}
          error={errors.phone?.message}
          required
        >
          <input
            id="delivery-phone"
            type="tel"
            dir="ltr"
            className="input text-start"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
        </FormField>

        <div className="md:col-span-2">
          <FormField
            label={t("delivery.notes")}
            htmlFor="delivery-notes"
            hint={t("delivery.notesHint")}
            error={errors.notes?.message}
          >
            <textarea
              id="delivery-notes"
              rows={3}
              className="textarea"
              aria-invalid={Boolean(errors.notes)}
              {...register("notes")}
            />
          </FormField>
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-[#D9E1F4] pt-4">
        <button type="submit" className="btn btn-secondary" disabled={isSaving}>
          {isSaving ? t("actions.saving") : t("delivery.saveAddress")}
        </button>
      </div>
    </form>
  );
});

export default DeliveryAddressStep;

import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isEmptyValue(value) {
  return value === undefined || value === null || value === "";
}

function buildFieldSchema(field, t, enforceRequired) {
  const rules = field.validation || {};
  const isRequired = enforceRequired && field.required;

  if (field.type === "TEXT" || field.type === "TEXTAREA") {
    return z.any().superRefine((raw, ctx) => {
      const value = typeof raw === "string" ? raw.trim() : raw;
      if (isEmptyValue(value)) {
        if (isRequired) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("validation.required") });
        }
        return;
      }
      if (typeof value !== "string") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("validation.pattern") });
        return;
      }
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.minLength", { min: rules.minLength }),
        });
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.maxLength", { max: rules.maxLength }),
        });
      }
      if (rules.pattern && field.type === "TEXT") {
        try {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(value)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("validation.pattern") });
          }
        } catch {
          // Ignore malformed regex from server schema on client; server validates authoritatively
        }
      }
    });
  }

  if (field.type === "NUMBER") {
    return z.any().superRefine((raw, ctx) => {
      if (isEmptyValue(raw)) {
        if (isRequired) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("validation.required") });
        }
        return;
      }
      const num = typeof raw === "number" ? raw : Number(raw);
      if (Number.isNaN(num)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("validation.invalidNumber") });
        return;
      }
      if (rules.min !== undefined && num < rules.min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.min", { min: rules.min }),
        });
      }
      if (rules.max !== undefined && num > rules.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.max", { max: rules.max }),
        });
      }
    });
  }

  if (field.type === "DATE") {
    return z.any().superRefine((raw, ctx) => {
      if (isEmptyValue(raw)) {
        if (isRequired) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("validation.required") });
        }
        return;
      }
      if (typeof raw !== "string" || !DATE_REGEX.test(raw)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("validation.invalidDate") });
        return;
      }
      if (rules.minDate && raw < rules.minDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.minDate", { minDate: rules.minDate }),
        });
      }
      if (rules.maxDate && raw > rules.maxDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t("validation.maxDate", { maxDate: rules.maxDate }),
        });
      }
    });
  }

  if (field.type === "SELECT") {
    const allowedValues = (field.options || []).map((opt) => opt.value);
    return z.any().superRefine((raw, ctx) => {
      if (isEmptyValue(raw)) {
        if (isRequired) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("validation.required") });
        }
        return;
      }
      if (!allowedValues.includes(raw)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: t("validation.invalidOption") });
      }
    });
  }

  if (field.type === "CHECKBOX") {
    return z.boolean().refine((val) => !isRequired || val === true, {
      message: t("validation.required"),
    });
  }

  return z.any();
}

export function buildFormSchema(fields, t, { enforceRequired = false } = {}) {
  const shape = {};
  for (const field of fields || []) {
    shape[field.key] = buildFieldSchema(field, t, enforceRequired);
  }
  return z.object(shape);
}

// Converts a raw form value to the API contract value type (or null when cleared)
export function normalizeFieldValue(field, rawValue) {
  if (field.type === "CHECKBOX") {
    return Boolean(rawValue);
  }
  if (field.type === "NUMBER") {
    if (isEmptyValue(rawValue)) return null;
    const num = Number(rawValue);
    return Number.isNaN(num) ? null : num;
  }
  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    return trimmed === "" ? null : trimmed;
  }
  return isEmptyValue(rawValue) ? null : rawValue;
}

// Builds default values for react-hook-form from application.data
export function buildDefaultValues(fields, savedData = {}) {
  const defaults = {};
  for (const field of fields || []) {
    const value = savedData?.[field.key];
    if (field.type === "CHECKBOX") {
      defaults[field.key] = Boolean(value);
    } else if (value === null || value === undefined) {
      defaults[field.key] = "";
    } else {
      defaults[field.key] = String(value);
    }
  }
  return defaults;
}

// Computes only the keys that changed compared to lastSavedData
export function getChangedData(fields, currentValues, lastSavedData = {}) {
  const changed = {};
  for (const field of fields || []) {
    const nextVal = normalizeFieldValue(field, currentValues[field.key]);
    const prevRaw = lastSavedData?.[field.key];
    const prevVal = prevRaw === undefined ? (field.type === "CHECKBOX" ? false : null) : prevRaw;

    if (nextVal !== prevVal) {
      changed[field.key] = nextVal;
    }
  }
  return changed;
}

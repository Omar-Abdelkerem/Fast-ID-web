import { z } from "zod";

export const CATEGORIES = ["IDENTITY", "LICENSE", "CIVIL_RECORD", "OTHER"];
export const FIELD_TYPES = ["TEXT", "TEXTAREA", "NUMBER", "DATE", "SELECT", "CHECKBOX"];
export const MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const fieldKeyRegex = /^[a-z][a-zA-Z0-9]{0,39}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const MB = 1048576;

// the inputs hold text, so numbers are kept as strings here and checked below
const localized = z.object({ ar: z.string(), en: z.string() });

const optionSchema = z.object({ value: z.string(), label: localized });

const fieldSchema = z.object({
  key: z.string(),
  label: localized,
  helpText: localized,
  type: z.enum(FIELD_TYPES),
  required: z.boolean(),
  options: z.array(optionSchema),
  minLength: z.string(),
  maxLength: z.string(),
  min: z.string(),
  max: z.string(),
  minDate: z.string(),
  maxDate: z.string(),
  pattern: z.string(),
});

const docSchema = z.object({
  key: z.string(),
  label: localized,
  required: z.boolean(),
  allowedMimeTypes: z.array(z.enum(["image/jpeg", "image/png", "application/pdf"])),
  maxSizeMb: z.string(),
});

const isInt = (text) => /^-?\d+$/.test(text);
const isEmpty = (text) => text.trim() === "";

// error messages are i18n keys under "validation." in the locale file
function checkLocalized(ctx, value, path, max) {
  ["ar", "en"].forEach((lang) => {
    const text = value[lang].trim();
    if (text.length < 1) ctx.addIssue({ code: "custom", path: [...path, lang], message: "required" });
    else if (text.length > max) ctx.addIssue({ code: "custom", path: [...path, lang], message: "tooLong" });
  });
}

function checkIntRange(ctx, text, path, min, max) {
  if (!isInt(text) || Number(text) < min || Number(text) > max) {
    ctx.addIssue({ code: "custom", path, message: "intRange" });
    return false;
  }
  return true;
}

function checkField(ctx, field, index, seenKeys) {
  const base = ["fields", index];
  const issue = (name, message) => ctx.addIssue({ code: "custom", path: [...base, name], message });

  if (!fieldKeyRegex.test(field.key)) issue("key", "invalidKey");
  else if (seenKeys.has(field.key)) issue("key", "duplicate");
  seenKeys.add(field.key);

  checkLocalized(ctx, field.label, [...base, "label"], 100);

  // help text: both languages or none
  const hasAr = !isEmpty(field.helpText.ar);
  const hasEn = !isEmpty(field.helpText.en);
  if (hasAr !== hasEn) issue(hasAr ? "helpText.en" : "helpText.ar", "bothLanguages");

  if (field.type === "SELECT") {
    if (field.options.length < 2 || field.options.length > 50) issue("options", "optionsCount");
    const seenValues = new Set();
    field.options.forEach((option, optionIndex) => {
      const optionPath = [...base, "options", optionIndex];
      if (isEmpty(option.value)) ctx.addIssue({ code: "custom", path: [...optionPath, "value"], message: "required" });
      else if (seenValues.has(option.value)) ctx.addIssue({ code: "custom", path: [...optionPath, "value"], message: "duplicate" });
      seenValues.add(option.value);
      checkLocalized(ctx, option.label, [...optionPath, "label"], 100);
    });
  }

  if (field.type === "TEXT" || field.type === "TEXTAREA") {
    const minOk = isEmpty(field.minLength) || checkIntRange(ctx, field.minLength, [...base, "minLength"], 0, 2000);
    const maxOk = isEmpty(field.maxLength) || checkIntRange(ctx, field.maxLength, [...base, "maxLength"], 0, 2000);
    if (minOk && maxOk && !isEmpty(field.minLength) && !isEmpty(field.maxLength) && Number(field.minLength) > Number(field.maxLength)) {
      issue("minLength", "minAboveMax");
    }
  }

  if (field.type === "TEXT" && !isEmpty(field.pattern)) {
    if (field.pattern.length > 200) issue("pattern", "tooLong");
    else {
      try {
        new RegExp(field.pattern);
      } catch {
        issue("pattern", "invalidRegex");
      }
    }
  }

  if (field.type === "NUMBER") {
    const minOk = isEmpty(field.min) || !Number.isNaN(Number(field.min));
    const maxOk = isEmpty(field.max) || !Number.isNaN(Number(field.max));
    if (!minOk) issue("min", "notNumber");
    if (!maxOk) issue("max", "notNumber");
    if (minOk && maxOk && !isEmpty(field.min) && !isEmpty(field.max) && Number(field.min) > Number(field.max)) issue("min", "minAboveMax");
  }

  if (field.type === "DATE") {
    const minOk = isEmpty(field.minDate) || dateRegex.test(field.minDate);
    const maxOk = isEmpty(field.maxDate) || dateRegex.test(field.maxDate);
    if (!minOk) issue("minDate", "invalidDate");
    if (!maxOk) issue("maxDate", "invalidDate");
    if (minOk && maxOk && !isEmpty(field.minDate) && !isEmpty(field.maxDate) && field.minDate > field.maxDate) issue("minDate", "minAfterMax");
  }
}

function checkDoc(ctx, doc, index, seenKeys) {
  const base = ["requiredDocuments", index];
  if (!fieldKeyRegex.test(doc.key)) ctx.addIssue({ code: "custom", path: [...base, "key"], message: "invalidKey" });
  else if (seenKeys.has(doc.key)) ctx.addIssue({ code: "custom", path: [...base, "key"], message: "duplicate" });
  seenKeys.add(doc.key);

  checkLocalized(ctx, doc.label, [...base, "label"], 100);

  if (doc.allowedMimeTypes.length < 1) ctx.addIssue({ code: "custom", path: [...base, "allowedMimeTypes"], message: "atLeastOne" });

  const bytes = Math.round(Number(doc.maxSizeMb) * MB);
  if (isEmpty(doc.maxSizeMb) || Number.isNaN(bytes) || bytes < 1 || bytes > 10 * MB) {
    ctx.addIssue({ code: "custom", path: [...base, "maxSizeMb"], message: "sizeRange" });
  }
}

// isNew: the slug is only editable (and checked) when creating
export function makeServiceSchema(isNew) {
  return z
    .object({
      id: z.string(),
      name: localized,
      description: localized,
      category: z.enum(CATEGORIES),
      feeEgp: z.string(),
      slaDays: z.string(),
      neverExpires: z.boolean(),
      validityYears: z.string(),
      requiredDocuments: z.array(docSchema).max(10, "tooMany"),
      fields: z.array(fieldSchema).max(30, "tooMany"),
    })
    .superRefine((values, ctx) => {
      if (isNew && (values.id.length < 3 || values.id.length > 60 || !slugRegex.test(values.id))) {
        ctx.addIssue({ code: "custom", path: ["id"], message: "invalidSlug" });
      }
      checkLocalized(ctx, values.name, ["name"], 100);
      checkLocalized(ctx, values.description, ["description"], 500);

      const piastres = Math.round(Number(values.feeEgp) * 100);
      if (!/^\d+(\.\d{1,2})?$/.test(values.feeEgp.trim()) || piastres > 10000000) {
        ctx.addIssue({ code: "custom", path: ["feeEgp"], message: "feeRange" });
      }

      checkIntRange(ctx, values.slaDays, ["slaDays"], 1, 90);
      if (!values.neverExpires) checkIntRange(ctx, values.validityYears, ["validityYears"], 1, 30);

      const docKeys = new Set();
      values.requiredDocuments.forEach((doc, index) => checkDoc(ctx, doc, index, docKeys));
      const fieldKeys = new Set();
      values.fields.forEach((field, index) => checkField(ctx, field, index, fieldKeys));
    });
}

export const emptyLocalized = { ar: "", en: "" };

export const newField = () => ({
  key: "", label: { ...emptyLocalized }, helpText: { ...emptyLocalized }, type: "TEXT", required: false,
  options: [], minLength: "", maxLength: "", min: "", max: "", minDate: "", maxDate: "", pattern: "",
});

export const newDoc = () => ({
  key: "", label: { ...emptyLocalized }, required: true, allowedMimeTypes: ["application/pdf"], maxSizeMb: "5",
});

export const emptyFormValues = {
  id: "", name: { ...emptyLocalized }, description: { ...emptyLocalized }, category: "IDENTITY",
  feeEgp: "0", slaDays: "7", neverExpires: false, validityYears: "7", requiredDocuments: [], fields: [],
};

// which validation keys each field type allows
const validationKeys = {
  TEXT: ["minLength", "maxLength", "pattern"],
  TEXTAREA: ["minLength", "maxLength"],
  NUMBER: ["min", "max"],
  DATE: ["minDate", "maxDate"],
};
const numericKeys = ["minLength", "maxLength", "min", "max"];

function buildValidation(field) {
  const validation = {};
  (validationKeys[field.type] || []).forEach((key) => {
    if (isEmpty(field[key])) return;
    validation[key] = numericKeys.includes(key) ? Number(field[key]) : field[key];
  });
  return validation;
}

// form values -> API body (the contract's ServiceDefinition)
export function toBody(values) {
  return {
    name: { ar: values.name.ar.trim(), en: values.name.en.trim() },
    description: { ar: values.description.ar.trim(), en: values.description.en.trim() },
    category: values.category,
    fee: { amount: Math.round(Number(values.feeEgp) * 100), currency: "EGP" },
    slaDays: Number(values.slaDays),
    validityYears: values.neverExpires ? null : Number(values.validityYears),
    requiredDocuments: values.requiredDocuments.map((doc) => ({
      key: doc.key,
      label: { ar: doc.label.ar.trim(), en: doc.label.en.trim() },
      required: doc.required,
      allowedMimeTypes: doc.allowedMimeTypes,
      maxSizeBytes: Math.round(Number(doc.maxSizeMb) * MB),
    })),
    formSchema: {
      fields: values.fields.map((field) => ({
        key: field.key,
        label: { ar: field.label.ar.trim(), en: field.label.en.trim() },
        helpText: isEmpty(field.helpText.ar) && isEmpty(field.helpText.en) ? null : { ar: field.helpText.ar.trim(), en: field.helpText.en.trim() },
        type: field.type,
        required: field.required,
        options: field.type === "SELECT" ? field.options.map((o) => ({ value: o.value, label: { ar: o.label.ar.trim(), en: o.label.en.trim() } })) : null,
        validation: buildValidation(field),
      })),
    },
  };
}

// API draft -> form values
export function fromDraft(id, draft) {
  const text = (value) => (value === undefined || value === null ? "" : String(value));
  return {
    id,
    name: { ...draft.name },
    description: { ...draft.description },
    category: draft.category,
    feeEgp: String(draft.fee.amount / 100),
    slaDays: String(draft.slaDays),
    neverExpires: draft.validityYears === null,
    validityYears: draft.validityYears === null ? "7" : String(draft.validityYears),
    requiredDocuments: draft.requiredDocuments.map((doc) => ({
      key: doc.key,
      label: { ...doc.label },
      required: doc.required,
      allowedMimeTypes: [...doc.allowedMimeTypes],
      maxSizeMb: String(Math.round((doc.maxSizeBytes / MB) * 100) / 100),
    })),
    fields: draft.formSchema.fields.map((field) => ({
      key: field.key,
      label: { ...field.label },
      helpText: field.helpText ? { ...field.helpText } : { ...emptyLocalized },
      type: field.type,
      required: field.required,
      options: (field.options || []).map((o) => ({ value: o.value, label: { ...o.label } })),
      minLength: text(field.validation.minLength),
      maxLength: text(field.validation.maxLength),
      min: text(field.validation.min),
      max: text(field.validation.max),
      minDate: text(field.validation.minDate),
      maxDate: text(field.validation.maxDate),
      pattern: text(field.validation.pattern),
    })),
  };
}

// only the top-level keys that differ (arrays and objects are replaced as a whole)
export function getChangedKeys(currentBody, initialBody) {
  const changed = {};
  Object.keys(currentBody).forEach((key) => {
    if (JSON.stringify(currentBody[key]) !== JSON.stringify(initialBody[key])) changed[key] = currentBody[key];
  });
  return changed;
}

// "formSchema.fields[2].options" -> "fields.2.options", "requiredDocuments[0].key" -> "requiredDocuments.0.key"
export function serverPathToFormPath(path) {
  return path
    .replace(/^formSchema\.fields/, "fields")
    .replace(/^fee(\.amount)?$/, "feeEgp")
    .replace(/\[(\d+)\]/g, ".$1");
}

// which row a server path points to, e.g. { list: "fields", index: 2 }
export function parseRow(path) {
  const match = path.match(/^(?:formSchema\.)?(fields|requiredDocuments)\[(\d+)\]/);
  return match ? { list: match[1], index: Number(match[2]) } : null;
}

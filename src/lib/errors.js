// Branch on error.code, never on error.message, and never show error.message to users.

// Translated text for error.code. Messages live in each feature's locale file under "errors".
export function getErrorMessage(error, t) {
  const key = `errors.${error?.code}`;
  const text = t(key);
  if (text !== key) return text;
  return t("errors.UNKNOWN", { defaultValue: "Something went wrong. Please try again." });
}

// react-hook-form: maps error.field and error.details to field errors.
// opts.fieldMap renames server paths, for example { "data.reason": "reason" }.
// Returns true if at least one field error was set.
export function applyServerErrors(error, setError, t, opts = {}) {
  const fieldMap = opts.fieldMap || {};
  let applied = false;

  const setFieldError = (path, code) => {
    if (!path) return;
    setError(fieldMap[path] || path, { type: "server", message: t(`errors.${code}`, { defaultValue: t("errors.INVALID", { defaultValue: code }) }) });
    applied = true;
  };

  if (Array.isArray(error?.details) && error.details.length > 0) {
    error.details.forEach((detail) => setFieldError(detail.field, detail.code || error.code));
  } else if (error?.field) {
    setFieldError(error.field, error.code);
  }
  return applied;
}

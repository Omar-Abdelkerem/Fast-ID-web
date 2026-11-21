function translateCode(t, code) {
  if (!code || typeof t !== "function") {
    return "";
  }
  const key = `errors.${code}`;
  const value = t(key, { defaultValue: "" });
  if (value && value !== key) {
    return value;
  }
  return "";
}

function getFallbackMessage(t, key) {
  if (typeof t !== "function") {
    return "";
  }
  const namespaced = t(`common:${key}`, { defaultValue: "" });
  if (namespaced && namespaced !== `common:${key}`) {
    return namespaced;
  }
  const plain = t(key, { defaultValue: "" });
  if (plain && plain !== key) {
    return plain;
  }
  return "";
}

export function getErrorMessage(error, t) {
  const code = error?.code;
  const translated = translateCode(t, code);
  if (translated) {
    return translated;
  }
  return getFallbackMessage(t, "errors.UNKNOWN");
}

export function applyServerErrors(error, setError, t, options = {}) {
  if (!error || typeof setError !== "function") {
    return false;
  }

  const fieldMap = options?.fieldMap || {};
  const mapField = (serverField) => fieldMap[serverField] || serverField;

  if (Array.isArray(error.details) && error.details.length > 0) {
    let applied = false;

    for (const detail of error.details) {
      if (!detail?.field) continue;
      const targetField = mapField(detail.field);
      const detailMessage =
        translateCode(t, detail.code) ||
        getFallbackMessage(t, "errors.VALIDATION_ERROR");

      setError(targetField, {
        type: "server",
        message: detailMessage,
      });
      applied = true;
    }

    return applied;
  }

  if (error.field) {
    const targetField = mapField(error.field);
    setError(targetField, {
      type: "server",
      message: getErrorMessage(error, t),
    });
    return true;
  }

  return false;
}

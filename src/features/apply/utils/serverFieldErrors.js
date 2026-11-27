// Pass only the current step's field errors to react-hook-form.
// The server can report data.* and deliveryAddress.* together.
export function getStepServerError(error, prefix) {
  if (!error) return null;
  const details = (error.details || []).filter((entry) =>
    typeof entry.field === "string" && entry.field.startsWith(prefix)
  );
  const field = error.field?.startsWith(prefix) ? error.field : details[0]?.field;
  if (!field) return null;
  return { ...error, field, details };
}

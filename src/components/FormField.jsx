import { cloneElement, isValidElement } from "react";
import { useTranslation } from "react-i18next";

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  children,
}) {
  const { t } = useTranslation("common");
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  let content = children;
  if (isValidElement(children)) {
    const existingDescribedBy = children.props["aria-describedby"];
    const mergedDescribedBy =
      [existingDescribedBy, describedBy].filter(Boolean).join(" ") || undefined;

    content = cloneElement(children, {
      id: children.props.id ?? htmlFor,
      "aria-describedby": mergedDescribedBy,
      "aria-invalid": error ? true : children.props["aria-invalid"],
    });
  }

  return (
    <div className="mb-4">
      {label ? (
        <label htmlFor={htmlFor} className="label">
          <span>{label}</span>
          {required ? (
            <span
              className="ms-1 text-danger"
              aria-label={t("states.required")}
            >
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {content}

      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

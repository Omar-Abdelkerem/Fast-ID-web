import { useTranslation } from "react-i18next";

// Fast ID Case Study status pills (Page 9, 13, 17, 20, 21) — WCAG AA compliant
const TONE_CLASSES = {
  success: "bg-success-bg text-success-dark border-success/25",
  warning: "bg-warning-bg text-warning-dark border-warning/25",
  info: "bg-sky text-navy border-blue/25",
  danger: "bg-danger-bg text-danger border-danger/25",
  dangerSolid: "bg-danger text-white border-danger",
  navySolid: "bg-navy text-white border-navy",
  neutral: "bg-white text-navy border-navy/30",
};

const DOT_CLASSES = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-blue",
  danger: "bg-danger",
  dangerSolid: "bg-white",
  navySolid: "bg-white",
  neutral: "bg-muted",
};

const STATUS_TONE_MAP = {
  application: {
    DRAFT: "neutral",
    SUBMITTED: "warning",
    UNDER_REVIEW: "warning",
    APPROVED: "success",
    REJECTED: "dangerSolid",
    OUT_FOR_DELIVERY: "info",
    DELIVERED: "navySolid",
    CANCELLED: "neutral",
  },
  delivery: {
    PENDING_ASSIGNMENT: "warning",
    ASSIGNED: "info",
    OUT_FOR_DELIVERY: "info",
    DELIVERED: "navySolid",
    FAILED_ATTEMPT: "danger",
  },
  credential: {
    ACTIVE: "success",
    REVOKED: "dangerSolid",
    EXPIRED: "danger",
  },
  payment: {
    NOT_REQUIRED: "neutral",
    UNPAID: "warning",
    PAID: "success",
  },
};

function resolveTone(kind, value) {
  if (kind && STATUS_TONE_MAP[kind]?.[value]) {
    return STATUS_TONE_MAP[kind][value];
  }
  for (const map of Object.values(STATUS_TONE_MAP)) {
    if (map[value]) return map[value];
  }
  return "neutral";
}

export function StatusBadge({ kind, value }) {
  const { t } = useTranslation("common");
  const tone = resolveTone(kind, value);

  const scopedKey = kind ? `status.${kind}.${value}` : null;
  const scopedLabel = scopedKey ? t(scopedKey, { defaultValue: "" }) : "";
  // Fall back to flat status.<VALUE> and finally the raw enum value (contract §0.1)
  const label =
    (scopedLabel && scopedLabel !== scopedKey ? scopedLabel : "") ||
    t(`status.${value}`, { defaultValue: value || "" });

  return (
    <span className={`badge ${TONE_CLASSES[tone]}`}>
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASSES[tone]}`}
      />
      <span>{label}</span>
    </span>
  );
}

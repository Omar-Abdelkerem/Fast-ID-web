const CAIRO_TIME_ZONE = "Africa/Cairo";

function resolveLocale(lang) {
  return typeof lang === "string" && lang.toLowerCase().startsWith("en")
    ? "en-EG"
    : "ar-EG";
}

function parseDate(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function formatDate(iso, lang = "ar") {
  const date = parseDate(iso);
  if (!date) return "";

  return new Intl.DateTimeFormat(resolveLocale(lang), {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(iso, lang = "ar") {
  const date = parseDate(iso);
  if (!date) return "";

  return new Intl.DateTimeFormat(resolveLocale(lang), {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMoney(money, lang = "ar") {
  if (!money || typeof money.amount !== "number") {
    return "";
  }

  const amountInEgp = money.amount / 100;
  return new Intl.NumberFormat(resolveLocale(lang), {
    style: "currency",
    currency: money.currency || "EGP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInEgp);
}

export function maskNationalId(id) {
  if (!id) return "";
  const value = String(id).trim();
  if (value.length < 4) {
    return "*".repeat(value.length);
  }
  return `${value.slice(0, 2)}${"*".repeat(10)}${value.slice(-2)}`;
}

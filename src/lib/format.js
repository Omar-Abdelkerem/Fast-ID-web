const TIME_ZONE = "Africa/Cairo";
const locale = (lang) => (lang === "en" ? "en-GB" : "ar-EG");

// ISO 8601 timestamp -> date in the Cairo time zone
export function formatDate(iso, lang) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale(lang), { timeZone: TIME_ZONE, dateStyle: "medium" }).format(new Date(iso));
}

export function formatDateTime(iso, lang) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale(lang), { timeZone: TIME_ZONE, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

// The contract's Money object: { amount: integer piastres, currency: "EGP" }
export function formatMoney(money, lang) {
  if (!money) return "—";
  return new Intl.NumberFormat(locale(lang), { style: "currency", currency: money.currency || "EGP" }).format(money.amount / 100);
}

// 29*********45 : first and last 2 digits only
export function maskNationalId(id) {
  if (!id || id.length < 5) return id || "";
  return `${id.slice(0, 2)}${"*".repeat(id.length - 4)}${id.slice(-2)}`;
}

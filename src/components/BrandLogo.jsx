export function BrandLogo({ variant = "light" }) {
  const isDark = variant === "dark";

  return (
    <span className="inline-flex items-center gap-1.5 font-heading text-lg font-bold tracking-tight ltr-value">
      <span className={isDark ? "text-white" : "text-navy"}>Fast</span>
      <span
        className={
          isDark
            ? "inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/15 px-1.5 py-0.5 text-sm font-bold text-white"
            : "inline-flex items-center justify-center rounded-lg bg-blue px-1.5 py-0.5 text-sm font-bold text-white"
        }
      >
        ID
      </span>
    </span>
  );
}

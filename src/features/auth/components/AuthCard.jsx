// The centred card used by every public auth page
export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="card p-6">
        <h1 className="page-title mb-1">{title}</h1>
        {subtitle && <p className="mb-4 text-sm text-muted">{subtitle}</p>}
        {children}
      </div>
      {footer && <div className="mt-4 text-center text-sm">{footer}</div>}
    </div>
  );
}

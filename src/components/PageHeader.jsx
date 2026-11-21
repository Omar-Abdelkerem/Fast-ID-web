export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

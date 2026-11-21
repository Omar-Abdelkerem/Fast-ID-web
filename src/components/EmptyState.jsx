export function EmptyState({ title, text, action }) {
  return (
    <div className="card flex flex-col items-center justify-center py-12 text-center">
      <div
        aria-hidden="true"
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky text-blue"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 13V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6m16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4m16 0h-4l-2 2h-4l-2-2H4"
          />
        </svg>
      </div>
      <h2 className="font-heading text-base font-bold text-navy">{title}</h2>
      {text ? <p className="mt-1 max-w-md text-sm text-muted">{text}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

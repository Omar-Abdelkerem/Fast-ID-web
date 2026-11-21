import { useTranslation } from "react-i18next";

function buildPageWindow(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push("ellipsis-start");
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push("ellipsis-end");
  }

  pages.push(totalPages);
  return pages;
}

export function Pagination({ meta, onPageChange }) {
  const { t } = useTranslation("common");

  if (!meta || !meta.totalPages || meta.totalPages <= 1) {
    return null;
  }

  const { page, totalPages, total } = meta;
  const items = buildPageWindow(page, totalPages);

  return (
    <nav
      aria-label={t("pagination.label")}
      className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-xs text-muted">
        {t("pagination.pageOf", { page, totalPages })}
        {typeof total === "number"
          ? ` · ${t("pagination.showing", { total })}`
          : ""}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 rtl:rotate-180"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
          <span>{t("pagination.previous")}</span>
        </button>

        {items.map((item) => {
          if (typeof item !== "number") {
            return (
              <span
                key={item}
                aria-hidden="true"
                className="px-2 text-xs text-muted"
              >
                …
              </span>
            );
          }

          const isActive = item === page;
          return (
            <button
              key={item}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onPageChange(item)}
              className={
                isActive
                  ? "btn-primary btn-sm min-w-[2rem]"
                  : "btn-secondary btn-sm min-w-[2rem]"
              }
            >
              {item}
            </button>
          );
        })}

        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <span>{t("pagination.next")}</span>
          <svg
            aria-hidden="true"
            className="h-3.5 w-3.5 rtl:rotate-180"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </nav>
  );
}

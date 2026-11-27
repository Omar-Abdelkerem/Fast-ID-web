import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Spinner,
  useLocalized,
  useToast,
} from "@/components";
import { getErrorMessage } from "@/lib/errors";
import "../theme.css";
import { formatDateTime } from "@/lib/format";
import {
  getNotifications,
  getNotificationTarget,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api";

const PAGE_SIZE = 10;

export default function NotificationsPage() {
  const { t, i18n } = useTranslation("notifications");
  const { localize } = useLocalized();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const isUnreadOnly = searchParams.get("isRead") === "false";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["notifications", "list", { isUnreadOnly, page, pageSize: PAGE_SIZE }],
    queryFn: () =>
      getNotifications({
        isRead: isUnreadOnly ? false : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => toast.error(getErrorMessage(err, t)),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("toasts.allRead"));
    },
    onError: (err) => toast.error(getErrorMessage(err, t)),
  });

  const items = response?.data || [];
  const meta = response?.meta;

  function setFilter(unreadOnly) {
    const next = new URLSearchParams();
    if (unreadOnly) next.set("isRead", "false");
    next.set("page", "1");
    setSearchParams(next);
  }

  function handlePageChange(nextPage) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  }

  function getTypeLabel(type) {
    return t(`types.${type}`, { defaultValue: t("types.OTHER") });
  }

  return (
    <div className="fid-theme fid-notifications mx-auto max-w-5xl">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={markAllMutation.isPending}
            onClick={() => markAllMutation.mutate()}
          >
            {markAllMutation.isPending
              ? t("actions.markingAll")
              : t("actions.markAllRead")}
          </button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter(false)}
          className={`btn btn-sm ${!isUnreadOnly ? "btn-primary" : "btn-secondary"}`}
        >
          {t("filters.all")}
        </button>
        <button
          type="button"
          onClick={() => setFilter(true)}
          className={`btn btn-sm ${isUnreadOnly ? "btn-primary" : "btn-secondary"}`}
        >
          {t("filters.unread")}
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {!isLoading && error && <ErrorState error={error} onRetry={refetch} />}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          title={isUnreadOnly ? t("empty.unreadTitle") : t("empty.allTitle")}
          text={isUnreadOnly ? t("empty.unreadText") : t("empty.allText")}
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <ul className="divide-y divide-[#D9E1F4]">
            {items.map((item) => {
              const target = getNotificationTarget(item);

              return (
                <li
                  key={item.id}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between ${
                    !item.isRead ? "bg-[#E7EEFC]/50" : "bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span
                      className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${
                        !item.isRead ? "bg-[#4765F4]" : "bg-line"
                      }`}
                      aria-hidden="true"
                    />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="badge bg-[#E7EEFC] text-[#252C68] text-xs">
                          {getTypeLabel(item.type)}
                        </span>
                        {!item.isRead && (
                          <span className="badge bg-[#4765F4]/10 text-[#4765F4] text-xs font-semibold">
                            {t("status.unread")}
                          </span>
                        )}
                        <span className="text-xs text-[#68769D]">
                          {formatDateTime(item.createdAt, i18n.language)}
                        </span>
                      </div>

                      {target ? (
                        <Link
                          to={target}
                          onClick={() => {
                            if (!item.isRead) markReadMutation.mutate(item.id);
                          }}
                          className="block text-base font-bold text-[#252C68] hover:underline"
                        >
                          {localize(item.title)}
                        </Link>
                      ) : (
                        <p className="text-base font-bold text-[#252C68]">
                          {localize(item.title)}
                        </p>
                      )}

                      <p className="text-sm text-[#68769D]">{localize(item.body)}</p>
                    </div>
                  </div>

                  {!item.isRead && (
                    <div className="shrink-0">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={markReadMutation.isPending}
                        onClick={() => markReadMutation.mutate(item.id)}
                      >
                        {t("actions.markRead")}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-6">
          <Pagination meta={meta} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Spinner, useLocalized, useToast } from "@/components";
import { getApiUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import "./theme.css";
import { formatDateTime } from "@/lib/format";
import {
  getNotifications,
  getNotificationTarget,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";

const POLL_INTERVAL_MS = 30_000;
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

export default function NotificationBell() {
  const { t, i18n } = useTranslation("notifications");
  const { localize } = useLocalized();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [usePolling, setUsePolling] = useState(USE_MOCKS || typeof EventSource === "undefined");
  const containerRef = useRef(null);
  const hasConnectedOnceRef = useRef(false);

  const { data: unreadData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: usePolling ? POLL_INTERVAL_MS : false,
  });

  const {
    data: latestRes,
    isLoading: isLoadingLatest,
    isError: isLatestError,
    refetch: refetchLatest,
  } = useQuery({
    queryKey: ["notifications", "dropdown"],
    queryFn: () => getNotifications({ page: 1, pageSize: 5 }),
    enabled: isAuthenticated && open,
  });

  const unreadCount = unreadData?.count ?? 0;
  const badgeText = unreadCount > 9 ? "9+" : String(unreadCount);
  const latestItems = latestRes?.data || [];

  // Single SSE connection for the whole app, with automatic polling fallback
  useEffect(() => {
    if (!isAuthenticated || !user?.id || USE_MOCKS || usePolling) return;
    const source = new EventSource(getApiUrl("/notifications/stream"), {
      withCredentials: true,
    });

    const handleOpen = () => {
      // No replay on SSE: refetch count and first page after any reconnect
      if (hasConnectedOnceRef.current) {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
      hasConnectedOnceRef.current = true;
    };

    const handleNotification = (event) => {
      try {
        const incoming = JSON.parse(event.data);

        queryClient.setQueryData(["notifications", "unread-count"], (prev) => ({
          count: (prev?.count ?? 0) + 1,
        }));

        queryClient.setQueryData(["notifications", "dropdown"], (prev) => {
          if (!prev?.data) return prev;
          const withoutDup = prev.data.filter((item) => item.id !== incoming.id);
          return { ...prev, data: [incoming, ...withoutDup].slice(0, 5) };
        });

        toast.info(localize(incoming.title));
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["applications"] });
      } catch {
        // Ignore malformed event payloads
      }
    };

    const handleError = () => {
      source.close();
      setUsePolling(true);
    };

    source.addEventListener("open", handleOpen);
    source.addEventListener("notification", handleNotification);
    source.addEventListener("error", handleError);

    return () => {
      source.removeEventListener("open", handleOpen);
      source.removeEventListener("notification", handleNotification);
      source.removeEventListener("error", handleError);
      source.close();
    };
  }, [isAuthenticated, user?.id, usePolling, queryClient, toast, localize]);

  useEffect(() => {
    if (!open) return;

    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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

  if (!isAuthenticated) return null;

  async function handleItemClick(item) {
    setOpen(false);
    if (!item.isRead) {
      markReadMutation.mutate(item.id);
    }
    const target = getNotificationTarget(item);
    if (target) {
      navigate(target);
    }
  }

  return (
    <div ref={containerRef} className="fid-theme fid-notification-bell relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={
          unreadCount > 0
            ? t("bell.unreadCount", { count: unreadCount })
            : t("bell.label")
        }
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#D9E1F4] bg-white text-[#252C68] transition hover:bg-[#E7EEFC] focus:outline-none focus:ring-2 focus:ring-[#4765F4]"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label={t("bell.label")}
          className="absolute end-0 z-50 mt-2 w-80 max-w-[92vw] overflow-hidden rounded-xl border border-[#D9E1F4] bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#D9E1F4] px-4 py-3">
            <h2 className="text-sm font-bold text-[#252C68]">{t("title")}</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markAllMutation.isPending}
                onClick={() => markAllMutation.mutate()}
                className="link text-xs font-medium disabled:opacity-50"
              >
                {markAllMutation.isPending
                  ? t("actions.markingAll")
                  : t("actions.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoadingLatest ? (
              <div className="flex justify-center py-8">
                <Spinner size="sm" />
              </div>
            ) : isLatestError ? (
              <div role="alert" className="space-y-3 px-4 py-6 text-center">
                <p className="text-sm text-danger">{t("bell.loadError")}</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => refetchLatest()}
                >
                  {t("bell.retry")}
                </button>
              </div>
            ) : latestItems.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[#68769D]">
                {t("bell.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-[#D9E1F4]">
                {latestItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={`flex w-full items-start gap-2.5 px-4 py-3 text-start transition hover:bg-[#E7EEFC]/50 ${
                        !item.isRead ? "bg-[#E7EEFC]/50" : "bg-white"
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          !item.isRead ? "bg-[#4765F4]" : "bg-transparent"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[#252C68]">
                            {localize(item.title)}
                          </span>
                          {!item.isRead && (
                            <span className="sr-only">{t("status.unread")}</span>
                          )}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-[#68769D]">
                          {localize(item.body)}
                        </span>
                        <span className="mt-1 block text-[11px] text-[#68769D]">
                          {formatDateTime(item.createdAt, i18n.language)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-[#D9E1F4] bg-[#E7EEFC]/35 px-4 py-2.5 text-center">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="link text-xs font-semibold"
            >
              {t("bell.viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

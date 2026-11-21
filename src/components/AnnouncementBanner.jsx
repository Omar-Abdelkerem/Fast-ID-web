import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { useLocalized } from "@/components";

// The platform announcement from GET /settings (null = nothing to show). Shown on top of every page.
export default function AnnouncementBanner() {
  const { localize } = useLocalized();
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet("/settings").then((res) => res.data),
    staleTime: 60 * 1000,
  });

  const text = localize(query.data?.announcement);
  if (!text) return null;
  return (
    <div role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-amber-100 p-3 text-sm text-warning dark:bg-[#3d3010] dark:text-[#f0c36a]">
      <span className="material-icons" aria-hidden="true">campaign</span>
      <span>{text}</span>
    </div>
  );
}

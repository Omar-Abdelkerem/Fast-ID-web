import { useSearchParams } from "react-router-dom";

// The page, page size and every filter live in the URL (shareable views, working back button).
// changeParams({ q: "ali" }) updates them and goes back to page 1.
export default function useListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params = Object.fromEntries(searchParams.entries());
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 20;

  function changeParams(changes) {
    const next = new URLSearchParams(searchParams);
    Object.entries({ page: "", ...changes }).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setSearchParams(next);
  }

  return { params, page, pageSize, changeParams, reset: () => setSearchParams({}) };
}

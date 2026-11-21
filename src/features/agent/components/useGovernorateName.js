import { useQuery } from "@tanstack/react-query";
import { useLocalized } from "@/components";
import { apiGet } from "@/lib/api";

// governorate code -> localized name
export default function useGovernorateName() {
  const { localize } = useLocalized();
  const query = useQuery({
    queryKey: ["reference", "governorates"],
    queryFn: () => apiGet("/reference/governorates").then((res) => res.data),
    staleTime: Infinity,
  });
  return (code) => {
    const found = (query.data || []).find((g) => g.code === code);
    return found ? localize(found.name) : code;
  };
}
